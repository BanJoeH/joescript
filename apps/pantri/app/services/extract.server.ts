import {
  type RecipeIngredient,
  type RecipeStep,
  recipeIngredientsSchema,
  recipeStepsSchema,
} from "~/lib/recipe-schema";
import {
  parseIngredientLine,
  refineExtractedIngredients,
} from "~/lib/refine-extracted-ingredients";

export type ExtractedRecipe = {
  name: string;
  servings: number | null;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
};

export type RecipePhotoBytes = {
  bytes: Uint8Array;
  contentType: string;
};

/** OCR-friendly vision model; no Meta EU license gate. */
const VISION_MODEL = "@cf/moondream/moondream3.1-9B-A2B";
/** Text model for structuring OCR into JSON; no Meta EU license gate. */
const STRUCTURE_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";

const TRANSCRIBE_QUESTION = `Transcribe this recipe photo verbatim.
Include the title, servings if shown, every ingredient line exactly as printed (one line each), and the full method/steps.
Copy only what you can read. Do not invent ingredients, blurbs, or rewrite the recipe. Output plain text only.`;

const DIRECT_JSON_QUESTION = `Extract the recipe from this image.

Return exactly one valid JSON object with this structure:
{
  "name": "string",
  "servings": null,
  "ingredients": [
    {
      "name": "string",
      "amount": null,
      "unit": null
    }
  ],
  "steps": [
    {
      "order": 1,
      "text": "string"
    }
  ]
}

Rules:
- Return JSON only. No markdown, no code fences, no commentary.
- Use only information visible in the image.
- Do not guess or invent missing information.
- Use null for missing or unclear servings, amounts, or units.
- Include "notes" only when there is preparation/detail text to preserve.
- Include exactly one ingredient per item.
- Ingredient "name" must contain only the food name, in lowercase.
- Put preparation details like "finely diced", "minced", or "room temperature" in "notes".
- Keep quantities as numbers only.
- Convert simple fractions to decimals, for example 1/2 -> 0.5.
- Keep units lowercase and singular where practical.
- Keep recipe steps in their original order.
- Set step "order" starting at 1 and increment by 1.
- Ignore marketing text, stories, captions, serving suggestions, and unrelated text.
- If no readable recipe is present, return:
  {
    "name": "",
    "servings": null,
    "ingredients": [],
    "steps": []
  }`;

const STRUCTURE_SYSTEM = `You convert recipe transcriptions into JSON. Output only valid JSON — no markdown, no commentary.`;

const STRUCTURE_QUESTION = `Convert the recipe transcription below into JSON with this shape:
{
  "name": string,
  "servings": number | null,
  "ingredients": Array<{ "name": string, "amount": number | null, "unit": string | null, "notes"?: string }>,
  "steps": Array<{ "order": number, "text": string }> | Array<string>
}

Rules:
- Use ONLY the transcription. Do not invent ingredients, amounts, or steps.
- ONE ingredient per array item. Never combine foods (bad: "beef, onion, chili powder").
- "name" is the food only, lowercase. Put prep like "finely diced" / "minced" in "notes".
- Copy amounts/units from the transcription. If missing or unclear, use null — do not invent cups/tbsp.
- Valid units examples: tsp, tbsp, cup, lb, oz, g, ml, clove, tin, can.
- Steps may be strings or { "order", "text" } objects.
- Ignore marketing blurbs that are not part of the recipe.

Transcription:
`;

const LOG_PREFIX = "[pantri:extract]";
const LOG_TEXT_LIMIT = 2000;

function logExtract(stage: string, detail?: unknown) {
  if (detail === undefined) {
    console.info(LOG_PREFIX, stage);
    return;
  }
  console.info(LOG_PREFIX, stage, detail);
}

function truncateForLog(text: string, limit = LOG_TEXT_LIMIT): string {
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…(+${text.length - limit} chars)`;
}

function summarizeRecipe(recipe: ExtractedRecipe) {
  return {
    name: recipe.name,
    servings: recipe.servings,
    ingredientCount: recipe.ingredients.length,
    stepCount: recipe.steps.length,
    ingredientNames: recipe.ingredients.map((ingredient) => ingredient.name),
    stepLengths: recipe.steps.map((step) => step.text.length),
  };
}

function placeholderRecipe(photoCount: number, nameHint?: string): ExtractedRecipe {
  return {
    name: nameHint?.trim() || "Imported recipe",
    servings: null,
    ingredients: [],
    steps: [
      {
        order: 0,
        text: `Add ingredients and steps from the ${photoCount} imported photo${photoCount === 1 ? "" : "s"}.`,
      },
    ],
  };
}

function bytesToDataUri(bytes: Uint8Array, contentType: string): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return `data:${contentType};base64,${btoa(binary)}`;
}

function stripModelReasoning(text: string): string {
  // Qwen3 (and similar) may wrap chain-of-thought in <think>…</think>.
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function extractJsonObject(text: string): unknown {
  const trimmed = stripModelReasoning(text);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1]?.trim() ?? trimmed;
  const start = candidate.indexOf("{");
  if (start === -1) {
    throw new Error("Model response did not contain JSON");
  }

  // Walk braces so trailing prose / duplicated SSE payloads don't break parse.
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < candidate.length; i++) {
    const char = candidate[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return JSON.parse(candidate.slice(start, i + 1));
      }
    }
  }

  throw new Error("Model response did not contain a complete JSON object");
}

function coerceAmount(value: unknown): number | null {
  if (value == null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const match = value.replace(",", ".").match(/-?\d+(\.\d+)?/);
    if (!match) return null;
    const parsed = Number(match[0]);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function coerceRawRecipe(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return raw;
  const record = raw as Record<string, unknown>;

  const ingredients = Array.isArray(record.ingredients)
    ? record.ingredients.map((item) => {
        if (typeof item === "string") {
          return parseIngredientLine(item) ?? { name: item, amount: null, unit: null };
        }
        if (!item || typeof item !== "object") return item;
        const ingredient = item as Record<string, unknown>;
        return {
          ...ingredient,
          amount: coerceAmount(ingredient.amount),
          unit: ingredient.unit == null || ingredient.unit === "" ? null : String(ingredient.unit),
          name:
            typeof ingredient.name === "string" ? ingredient.name : String(ingredient.name ?? ""),
        };
      })
    : record.ingredients;

  const steps = Array.isArray(record.steps)
    ? record.steps.map((item, index) => {
        // Models often return bare strings instead of { order, text }.
        if (typeof item === "string") {
          return { order: index, text: item.trim() };
        }
        if (!item || typeof item !== "object") return item;
        const step = item as Record<string, unknown>;
        const order =
          typeof step.order === "number" && Number.isFinite(step.order) ? step.order : index;
        const text =
          typeof step.text === "string" ? step.text : step.text == null ? "" : String(step.text);
        return { ...step, order, text };
      })
    : record.steps;

  return { ...record, ingredients, steps };
}

function normalizeExtracted(raw: unknown, fallbackName?: string): ExtractedRecipe {
  const coerced = coerceRawRecipe(raw);
  logExtract("normalize:coerced", coerced);

  const record = coerced as {
    name?: unknown;
    servings?: unknown;
    ingredients?: unknown;
    steps?: unknown;
  };

  const ingredientsResult = recipeIngredientsSchema.safeParse(record.ingredients ?? []);
  if (!ingredientsResult.success) {
    logExtract("normalize:ingredients-invalid", ingredientsResult.error.flatten());
  }

  const stepsResult = recipeStepsSchema.safeParse(record.steps ?? []);
  if (!stepsResult.success) {
    logExtract("normalize:steps-invalid", stepsResult.error.flatten());
  }

  // Keep valid rows even when some fail schema checks.
  const ingredients: RecipeIngredient[] = [];
  if (Array.isArray(record.ingredients)) {
    for (const [index, item] of record.ingredients.entries()) {
      const parsed = recipeIngredientsSchema.element.safeParse(item);
      if (parsed.success) {
        ingredients.push(parsed.data);
      } else {
        logExtract(`normalize:drop-ingredient[${index}]`, {
          item,
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }
    }
  }

  const steps: RecipeStep[] = [];
  if (Array.isArray(record.steps)) {
    for (const [index, item] of record.steps.entries()) {
      const parsed = recipeStepsSchema.element.safeParse(item);
      if (parsed.success) {
        steps.push({ ...parsed.data, order: steps.length });
      } else {
        logExtract(`normalize:drop-step[${index}]`, {
          item,
          issues: parsed.error.issues.map((issue) => issue.message),
        });
      }
    }
  }

  const name =
    typeof record.name === "string" && record.name.trim()
      ? record.name.trim()
      : fallbackName?.trim() || "Imported recipe";

  const servings =
    typeof record.servings === "number" && Number.isFinite(record.servings)
      ? Math.max(0, Math.round(record.servings))
      : coerceAmount(record.servings);

  const result = {
    name,
    servings: servings != null ? Math.max(0, Math.round(servings)) : null,
    ingredients: refineExtractedIngredients(ingredients),
    steps,
  };
  logExtract("normalize:result", summarizeRecipe(result));
  return result;
}

function mergeExtracted(parts: ExtractedRecipe[], nameHint?: string): ExtractedRecipe {
  if (parts.length === 0) return placeholderRecipe(0, nameHint);
  if (parts.length === 1) return parts[0];

  const name =
    parts.find((part) => part.name && part.name !== "Imported recipe")?.name ??
    nameHint?.trim() ??
    "Imported recipe";
  const servings = parts.find((part) => part.servings != null)?.servings ?? null;
  const ingredients = parts.flatMap((part) => part.ingredients);
  const steps = parts
    .flatMap((part) => part.steps)
    .map((step, index) => ({ ...step, order: index }));

  const merged = { name, servings, ingredients, steps };
  logExtract("merge:result", summarizeRecipe(merged));
  return merged;
}

type MoondreamStreamEvent = {
  answer?: string | null;
  caption?: string | null;
  response?: string | null;
  description?: string | null;
  text?: string | null;
  /** Moondream SSE wraps the growing answer here. */
  chunk?: {
    answer?: string | null;
    caption?: string | null;
    response?: string | null;
    text?: string | null;
  } | null;
};

function pieceFromMoondreamPayload(parsed: MoondreamStreamEvent): string | null {
  const nested = parsed.chunk;
  const piece =
    nested?.answer ??
    nested?.caption ??
    nested?.response ??
    nested?.text ??
    parsed.answer ??
    parsed.caption ??
    parsed.response ??
    parsed.description ??
    parsed.text;
  return typeof piece === "string" && piece ? piece : null;
}

/** Prefer cumulative final chunk; otherwise concatenate token deltas. */
function joinStreamChunks(chunks: string[]): string {
  if (chunks.length === 0) return "";
  if (chunks.length === 1) return chunks[0];

  const last = chunks[chunks.length - 1];
  const cumulative = chunks.every(
    (chunk, index) => index === 0 || chunk.startsWith(chunks[index - 1]),
  );
  if (cumulative) {
    logExtract("stream:join", { mode: "cumulative", chunks: chunks.length, chars: last.length });
    return last;
  }

  const longest = chunks.reduce((best, chunk) => (chunk.length > best.length ? chunk : best));
  if (longest.length > last.length * 0.5 && chunks.some((chunk) => longest.startsWith(chunk))) {
    logExtract("stream:join", { mode: "longest", chunks: chunks.length, chars: longest.length });
    return longest;
  }

  const joined = chunks.join("");
  logExtract("stream:join", { mode: "delta", chunks: chunks.length, chars: joined.length });
  return joined;
}

function isReadableStream(value: unknown): value is ReadableStream {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ReadableStream).getReader === "function"
  );
}

async function readStreamText(stream: ReadableStream): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let raw = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    raw += decoder.decode(value, { stream: true });
  }
  raw += decoder.decode();
  return raw;
}

/** Pull answer text from a Moondream object or SSE stream payload. */
async function moondreamAnswerText(response: unknown): Promise<string> {
  if (typeof response === "string") {
    logExtract("response:shape", { type: "string", chars: response.length });
    return response.trim();
  }

  if (isReadableStream(response)) {
    const raw = await readStreamText(response);
    logExtract("response:shape", {
      type: "ReadableStream",
      rawChars: raw.length,
      rawPreview: truncateForLog(raw, 400),
    });
    const chunks: string[] = [];
    let sseLines = 0;
    let parseFailures = 0;
    for (const line of raw.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      sseLines += 1;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const piece = pieceFromMoondreamPayload(JSON.parse(payload) as MoondreamStreamEvent);
        if (piece) chunks.push(piece);
      } catch {
        parseFailures += 1;
      }
    }
    logExtract("response:sse", { sseLines, answerEvents: chunks.length, parseFailures });
    if (chunks.length > 0) return joinStreamChunks(chunks).trim();
    // Do not fall back to raw SSE — extractJsonObject would grab the first event envelope.
    return "";
  }

  if (typeof response === "object" && response !== null) {
    const keys = Object.keys(response);
    logExtract("response:shape", { type: "object", keys });
    const piece = pieceFromMoondreamPayload(response as MoondreamStreamEvent);
    if (piece) return piece.trim();
  } else {
    logExtract("response:shape", { type: typeof response });
  }

  return "";
}

function responseShape(response: unknown): string {
  if (response === null) return "null";
  if (isReadableStream(response)) return "ReadableStream";
  if (typeof response === "object") {
    return `object keys=${Object.keys(response as object).join(",")}`;
  }
  return typeof response;
}

async function runMoondreamQuery(
  ai: Ai,
  photo: RecipePhotoBytes,
  question: string,
): Promise<string> {
  const response = await ai.run(
    VISION_MODEL as keyof AiModels,
    {
      task: "query",
      image: bytesToDataUri(photo.bytes, photo.contentType),
      question,
      reasoning: true,
      stream: true,
      max_tokens: 4096,
      temperature: 0,
    } as never,
  );

  const text = await moondreamAnswerText(response);
  if (!text) {
    throw new Error(`Vision model returned an empty response (${responseShape(response)})`);
  }
  return text;
}

function textFromChatResponse(response: unknown): string {
  if (typeof response === "string") return response.trim();
  if (!response || typeof response !== "object") return "";

  const record = response as Record<string, unknown>;
  if (typeof record.response === "string") return record.response.trim();
  if (typeof record.result === "string") return record.result.trim();

  // OpenAI-style chat completion shape (some Workers AI models).
  const choices = record.choices;
  if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
    const message = (choices[0] as Record<string, unknown>).message;
    if (message && typeof message === "object") {
      const content = (message as Record<string, unknown>).content;
      if (typeof content === "string") return content.trim();
      if (Array.isArray(content)) {
        const text = content
          .map((part) => {
            if (typeof part === "string") return part;
            if (!part || typeof part !== "object") return "";
            const textPart = (part as Record<string, unknown>).text;
            return typeof textPart === "string" ? textPart : "";
          })
          .filter(Boolean)
          .join("");
        if (text) return text.trim();
      }
    }
    const text = (choices[0] as Record<string, unknown>).text;
    if (typeof text === "string") return text.trim();
  }

  // Some deployed Workers AI routes return the parsed JSON object directly when
  // `response_format: { type: "json_object" }` is used.
  try {
    return JSON.stringify(response);
  } catch {
    return "";
  }
}

async function structureTranscript(
  ai: Ai,
  transcript: string,
  pageHint: string,
  jsonMode = true,
): Promise<string> {
  const response = await ai.run(
    STRUCTURE_MODEL as keyof AiModels,
    {
      messages: [
        { role: "system", content: STRUCTURE_SYSTEM },
        {
          role: "user",
          content: `${STRUCTURE_QUESTION}${transcript}${pageHint}`,
        },
      ],
      // Qwen reasoning models can spend the full token budget on
      // internal reasoning in deployed Workers AI and never emit JSON.
      reasoning_effort: null,
      max_tokens: 4096,
      temperature: 0,
      ...(jsonMode ? { response_format: { type: "json_object" as const } } : {}),
    } as never,
  );

  const text = textFromChatResponse(response);
  if (!text) {
    throw new Error(`Structure model returned an empty response (${responseShape(response)})`);
  }
  return text;
}

async function extractFromSinglePhoto(
  ai: Ai,
  photo: RecipePhotoBytes,
  nameHint: string | undefined,
  photoIndex: number,
  photoCount: number,
): Promise<ExtractedRecipe> {
  const pageHint =
    photoCount > 1
      ? `\nThis is photo ${photoIndex + 1} of ${photoCount}; use only what is on this page.`
      : "";

  logExtract(`photo[${photoIndex}]:start`, {
    bytes: photo.bytes.byteLength,
    contentType: photo.contentType,
    photoCount,
  });

  try {
    const directText = await runMoondreamQuery(ai, photo, `${DIRECT_JSON_QUESTION}${pageHint}`);
    logExtract(`photo[${photoIndex}]:direct-text`, {
      chars: directText.length,
      preview: truncateForLog(directText),
    });
    const parsed = extractJsonObject(directText);
    logExtract(`photo[${photoIndex}]:parsed-json-direct`, parsed);
    const normalized = normalizeExtracted(parsed, nameHint);
    logExtract(`photo[${photoIndex}]:done-direct`, summarizeRecipe(normalized));
    return normalized;
  } catch (error) {
    logExtract(`photo[${photoIndex}]:direct-failed`, {
      reason: error instanceof Error ? error.message : String(error),
    });
  }

  // Fallback: OCR first, then structure the transcript into JSON.
  const transcript = await runMoondreamQuery(ai, photo, `${TRANSCRIBE_QUESTION}${pageHint}`);
  logExtract(`photo[${photoIndex}]:transcript`, {
    chars: transcript.length,
    preview: truncateForLog(transcript),
  });

  let structuredText = await structureTranscript(ai, transcript, pageHint);
  logExtract(`photo[${photoIndex}]:structured-text`, {
    chars: structuredText.length,
    preview: truncateForLog(structuredText),
  });

  let parsed: unknown;
  try {
    parsed = extractJsonObject(structuredText);
  } catch (error) {
    logExtract(`photo[${photoIndex}]:structured-retry`, {
      reason: error instanceof Error ? error.message : String(error),
    });
    structuredText = await structureTranscript(ai, transcript, pageHint, false);
    logExtract(`photo[${photoIndex}]:structured-text-retry`, {
      chars: structuredText.length,
      preview: truncateForLog(structuredText),
    });
    parsed = extractJsonObject(structuredText);
  }
  logExtract(`photo[${photoIndex}]:parsed-json`, parsed);
  const normalized = normalizeExtracted(parsed, nameHint);
  logExtract(`photo[${photoIndex}]:done`, summarizeRecipe(normalized));
  return normalized;
}

/**
 * Extract a structured recipe from one or more photo byte payloads using
 * Workers AI vision. Falls back to an editable placeholder if AI is unavailable
 * or the model response cannot be parsed.
 */
export async function extractRecipeFromPhotos(options: {
  photos: RecipePhotoBytes[];
  ai?: Ai;
  nameHint?: string;
}): Promise<ExtractedRecipe> {
  const { photos, ai, nameHint } = options;
  logExtract("start", {
    visionModel: VISION_MODEL,
    structureModel: STRUCTURE_MODEL,
    photoCount: photos.length,
    totalBytes: photos.reduce((sum, photo) => sum + photo.bytes.byteLength, 0),
    hasAi: Boolean(ai),
    nameHint: nameHint ?? null,
  });

  if (photos.length === 0) {
    logExtract("fallback", "no photos");
    return placeholderRecipe(0, nameHint);
  }

  if (!ai) {
    logExtract("fallback", "AI binding missing");
    return placeholderRecipe(photos.length, nameHint);
  }

  try {
    const parts: ExtractedRecipe[] = [];
    for (const [index, photo] of photos.entries()) {
      parts.push(await extractFromSinglePhoto(ai, photo, nameHint, index, photos.length));
    }
    const merged = mergeExtracted(parts, nameHint);
    logExtract("success", summarizeRecipe(merged));
    return merged;
  } catch (error) {
    console.error(LOG_PREFIX, "failed; using editable placeholder", error);
    const placeholder = placeholderRecipe(photos.length, nameHint);
    logExtract("fallback:placeholder", summarizeRecipe(placeholder));
    return placeholder;
  }
}
