export const MAX_RECIPE_HTML_BYTES = 1_500_000;
export const MAX_RECIPE_FETCH_HOPS = 5;
export const MAX_PAGE_TEXT_CHARS = 24_000;
export const RECIPE_FETCH_TIMEOUT_MS = 12_000;

export class RecipeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RecipeUrlError";
  }
}

const BLOCKED_HOSTS = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.google.com",
  "kubernetes",
  "host.docker.internal",
]);

const BLOCKED_HOST_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp"];

export function normalizeUserRecipeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) {
    throw new RecipeUrlError("Paste a recipe link first.");
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    throw new RecipeUrlError("Use an http or https link.");
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return `https://${trimmed}`;
  }
  return trimmed;
}

export function assertSafeHttpUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(normalizeUserRecipeUrl(raw));
  } catch {
    throw new RecipeUrlError("That does not look like a valid link.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new RecipeUrlError("Use an http or https link.");
  }
  if (url.username || url.password) {
    throw new RecipeUrlError("That link is not allowed.");
  }
  if (url.port && url.port !== "80" && url.port !== "443") {
    throw new RecipeUrlError("That link is not allowed.");
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (!hostname || BLOCKED_HOSTS.has(hostname)) {
    throw new RecipeUrlError("That link is not allowed.");
  }
  if (BLOCKED_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) {
    throw new RecipeUrlError("That link is not allowed.");
  }
  if (isIpLiteral(hostname)) {
    throw new RecipeUrlError("That link is not allowed.");
  }

  return url;
}

function isIpLiteral(hostname: string): boolean {
  if (hostname.includes(":")) return true;
  if (!/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname)) return false;
  return hostname.split(".").every((part) => {
    const n = Number(part);
    return Number.isInteger(n) && n >= 0 && n <= 255;
  });
}

export type RecipePageFetch = (
  input: string,
  init?: RequestInit,
) => Promise<Pick<Response, "ok" | "status" | "headers" | "arrayBuffer">>;

export async function fetchRecipePageHtml(
  rawUrl: string,
  fetchImpl: RecipePageFetch = fetch,
): Promise<{ url: string; html: string }> {
  let current = assertSafeHttpUrl(rawUrl);

  for (let hop = 0; hop <= MAX_RECIPE_FETCH_HOPS; hop++) {
    let response: Awaited<ReturnType<RecipePageFetch>>;
    try {
      response = await fetchImpl(current.href, {
        method: "GET",
        redirect: "manual",
        headers: {
          Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-GB,en;q=0.9",
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(RECIPE_FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      if (error instanceof RecipeUrlError) throw error;
      throw new RecipeUrlError("Could not load that page.");
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("Location");
      if (!location) {
        throw new RecipeUrlError("Could not load that page.");
      }
      current = assertSafeHttpUrl(new URL(location, current).href);
      continue;
    }

    if (!response.ok) {
      throw new RecipeUrlError(`Could not load that page (${response.status}).`);
    }

    const contentType = (response.headers.get("Content-Type") ?? "").toLowerCase();
    if (
      contentType &&
      !contentType.includes("html") &&
      !contentType.includes("xml") &&
      !contentType.includes("json") &&
      !contentType.startsWith("text/")
    ) {
      throw new RecipeUrlError("That page does not look like a recipe.");
    }

    const contentLength = Number(response.headers.get("Content-Length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_RECIPE_HTML_BYTES) {
      throw new RecipeUrlError("That page is too large to import.");
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.byteLength > MAX_RECIPE_HTML_BYTES) {
      throw new RecipeUrlError("That page is too large to import.");
    }

    return { url: current.href, html: new TextDecoder("utf-8", { fatal: false }).decode(bytes) };
  }

  throw new RecipeUrlError("That link redirected too many times.");
}

export type JsonLdRawRecipe = {
  name: string;
  description: string | null;
  servings: number | null;
  ingredients: string[];
  steps: string[];
};

export function parseJsonLdRecipes(html: string): JsonLdRawRecipe[] {
  const recipes: JsonLdRawRecipe[] = [];
  for (const node of collectJsonLdNodes(html)) {
    const parsed = jsonLdNodeToRecipe(node);
    if (parsed) recipes.push(parsed);
  }
  return recipes;
}

export function pickBestJsonLdRecipe(html: string): JsonLdRawRecipe | null {
  const recipes = parseJsonLdRecipes(html);
  if (recipes.length === 0) return null;
  return recipes.reduce((best, current) => {
    const bestScore = best.ingredients.length * 2 + best.steps.length;
    const currentScore = current.ingredients.length * 2 + current.steps.length;
    return currentScore > bestScore ? current : best;
  });
}

export function jsonLdRecipeLooksComplete(recipe: JsonLdRawRecipe): boolean {
  return recipe.ingredients.length >= 1 || recipe.steps.length >= 2;
}

export function htmlToPlainText(html: string): string {
  let text = html.replace(/<script\b[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ");
  text = text.replace(/<svg\b[\s\S]*?<\/svg>/gi, " ");
  text = text.replace(/<(br|hr)\b[^>]*>/gi, "\n");
  text = text.replace(/<\/(p|div|li|h[1-6]|tr|section|article|blockquote)>/gi, "\n");
  text = text.replace(/<[^>]+>/g, " ");
  text = decodeHtmlEntities(text);
  text = text
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  if (text.length > MAX_PAGE_TEXT_CHARS) {
    text = text.slice(0, MAX_PAGE_TEXT_CHARS);
  }
  return text;
}

function collectJsonLdNodes(html: string): unknown[] {
  const nodes: unknown[] = [];
  const scriptRe = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  for (const match of html.matchAll(scriptRe)) {
    const attrs = match[1] ?? "";
    if (!/type\s*=\s*["']application\/ld\+json["']/i.test(attrs)) continue;
    const raw = unwrapCdata(decodeHtmlEntities(match[2].trim()));
    const parsed = parseLooseJson(raw);
    if (parsed == null) continue;
    walkJsonLd(parsed, nodes);
  }
  return nodes;
}

function unwrapCdata(value: string): string {
  return value.replace(/^\/\/<!\[CDATA\[|\/\/\]\]>$/g, "").replace(/<!\[CDATA\[|\]\]>/g, "");
}

function parseLooseJson(raw: string): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(raw.replace(/,\s*([}\]])/g, "$1"));
    } catch {
      return null;
    }
  }
}

function walkJsonLd(value: unknown, out: unknown[]): void {
  if (Array.isArray(value)) {
    for (const item of value) walkJsonLd(item, out);
    return;
  }
  if (!value || typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  out.push(record);
  if (record["@graph"] != null) walkJsonLd(record["@graph"], out);
}

function typeIncludes(value: unknown, type: string): boolean {
  const types = Array.isArray(value) ? value : [value];
  return types.some((entry) => {
    if (typeof entry !== "string") return false;
    const normalized = entry.toLowerCase();
    return normalized === type.toLowerCase() || normalized.endsWith(`/${type.toLowerCase()}`);
  });
}

function jsonLdNodeToRecipe(node: unknown): JsonLdRawRecipe | null {
  if (!node || typeof node !== "object") return null;
  const record = node as Record<string, unknown>;
  if (!typeIncludes(record["@type"], "Recipe")) return null;

  const name = firstString(record.name) ?? firstString(record.headline) ?? "";
  const description = parseRecipeDescription(record.description);
  const ingredients = collectStrings(record.recipeIngredient);
  const steps = collectInstructionTexts(record.recipeInstructions);
  const servings = parseYield(record.recipeYield ?? record.yield);

  if (!name && ingredients.length === 0 && steps.length === 0) return null;
  return { name, description, servings, ingredients, steps };
}

function parseRecipeDescription(value: unknown): string | null {
  const text = firstString(value);
  if (!text) return null;
  let cleaned = text.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, " ");
  cleaned = decodeHtmlEntities(cleaned)
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  return cleaned || null;
}

function collectInstructionTexts(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => collectInstructionTexts(item));
  }
  if (typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  if (typeIncludes(record["@type"], "HowToSection") || typeIncludes(record["@type"], "ItemList")) {
    return collectInstructionTexts(record.itemListElement ?? record.steps);
  }
  if (typeIncludes(record["@type"], "HowToStep") || typeIncludes(record["@type"], "ListItem")) {
    const nested = record.item ?? record.itemListElement;
    if (nested) return collectInstructionTexts(nested);
    const text = firstString(record.text) ?? firstString(record.name);
    return text ? [text] : [];
  }
  const text = firstString(record.text) ?? firstString(record.name);
  return text ? [text] : [];
}

function collectStrings(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => collectStrings(item));
  if (typeof value === "object") {
    const text = firstString((value as Record<string, unknown>).text);
    return text ? [text] : [];
  }
  return [];
}

function firstString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstString(item);
      if (found) return found;
    }
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return firstString(record.name ?? record.text ?? record.value);
  }
  return null;
}

function parseYield(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value > 0 ? Math.round(value) : null;
  }
  if (typeof value === "string") {
    const match = value.replace(",", ".").match(/\d+(\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed) : null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const parsed = parseYield(item);
      if (parsed != null) return parsed;
    }
    return null;
  }
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return parseYield(record.value ?? record.name ?? record.text);
  }
  return null;
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, code: string) => {
      const n = Number(code);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, code: string) => {
      const n = Number.parseInt(code, 16);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    });
}
