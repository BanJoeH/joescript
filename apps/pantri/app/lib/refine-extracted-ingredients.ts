import type { RecipeIngredient } from "~/lib/recipe-schema";

const PREP_WORDS =
  "diced|minced|chopped|sliced|crushed|grated|shredded|drained|divided|peeled|seeded|softened|melted|room temperature|picked|rinsed|juiced";

const TRAILING_PREP_PATTERNS: RegExp[] = [
  /^(.*?)\s+(peeled and finely chopped)$/i,
  /^(.*?)\s+(peeled and chopped)$/i,
  /^(.*?)\s+(drained and rinsed)$/i,
  /^(.*?)\s+(leaves picked,\s*stalks finely chopped)$/i,
  /^(.*?)\s+(leaves picked)$/i,
  /^(.*?)\s+((?:finely|roughly|thinly)\s+(?:chopped|diced|minced|sliced|grated|shredded))$/i,
  /^(.*?)\s+(juiced)$/i,
  /^(.*?)\s+(to serve)$/i,
  /^(.*?)\s+(for cooking)$/i,
  /^(.*?)\s+(\d+\s+chopped)$/i,
];

const PREP_SUFFIX_RE = new RegExp(
  `^(.*?),\\s*((?:finely|roughly|thinly)\\s+)?(${PREP_WORDS})$`,
  "i",
);

const PREP_PREFIX_RE = new RegExp(`^((?:finely|roughly|thinly)\\s+)?(${PREP_WORDS})\\s+(.+)$`, "i");

const PREP_ONLY_RE = new RegExp(`^((?:finely|roughly|thinly)\\s+)?(${PREP_WORDS})$`, "i");

const KNOWN_UNITS = new Set([
  "tsp",
  "teaspoon",
  "teaspoons",
  "tbsp",
  "tablespoon",
  "tablespoons",
  "cup",
  "cups",
  "lb",
  "lbs",
  "pound",
  "pounds",
  "oz",
  "ounce",
  "ounces",
  "g",
  "gram",
  "grams",
  "kg",
  "ml",
  "l",
  "liter",
  "litre",
  "clove",
  "cloves",
  "tin",
  "tins",
  "can",
  "cans",
  "pinch",
  "pinches",
  "dash",
  "handful",
  "package",
  "pkg",
  "stick",
  "sticks",
]);

function joinNotes(...parts: Array<string | null | undefined>): string | undefined {
  const cleaned = parts.map((part) => part?.trim()).filter((part): part is string => Boolean(part));
  if (cleaned.length === 0) return undefined;
  return cleaned.join("; ");
}

export function cleanExtractedUnit(unit: string | null | undefined): string | null {
  if (unit == null) return null;
  const trimmed = unit.trim().toLowerCase().replace(/\s+/g, " ");
  if (!trimmed) return null;
  // Model noise like unit: "1"
  if (/^\d+(\.\d+)?$/.test(trimmed)) return null;
  if (/^\d+-ounce$/.test(trimmed) || /^\d+ ounce$/.test(trimmed)) return "oz";
  if (KNOWN_UNITS.has(trimmed)) {
    if (trimmed.startsWith("tea")) return "tsp";
    if (trimmed.startsWith("table")) return "tbsp";
    if (trimmed === "pound" || trimmed === "pounds" || trimmed === "lbs") return "lb";
    if (trimmed === "ounce" || trimmed === "ounces") return "oz";
    if (trimmed === "cups") return "cup";
    if (trimmed === "cloves") return "clove";
    if (trimmed === "tins") return "tin";
    if (trimmed === "cans") return "can";
    if (trimmed === "grams" || trimmed === "gram") return "g";
    return trimmed;
  }
  // Keep short unknown units that look intentional (e.g. "bunch")
  if (/^[a-z][a-z-]*$/.test(trimmed) && trimmed.length <= 12) return trimmed;
  return null;
}

const LEADING_UNIT_RE =
  /^(tablespoons?|teaspoons?|tbsp\.?|tsp\.?|cups?|pounds?|lbs?\.?|ounces?|oz\.?|grams?|kg|ml|l|liters?|litres?|cloves?|tins?|cans?|bunch(?:es)?|handfuls?)\b\s*/i;

const METRIC_CAN_RE = /^(\d+(?:\.\d+)?)\s*(g|kg|ml|l)\s+(?:can|cans|tin|tins)\s+(?:of\s+)?(.+)$/i;

const SIZE_PIECE_RE = /^(small|medium|large)\s+piece\s+of\s+(.+)$/i;

function normalizeUnicodeFractions(line: string): string {
  return line
    .replace(/^\u00bd(?=\s)/u, "1/2 ")
    .replace(/^\u00bc(?=\s)/u, "1/4 ")
    .replace(/^\u00be(?=\s)/u, "3/4 ")
    .replace(/^\u2153(?=\s)/u, "1/3 ")
    .replace(/^\u2154(?=\s)/u, "2/3 ");
}

function peelTrailingPrepWithoutComma(name: string): { name: string; prep?: string } {
  for (const pattern of TRAILING_PREP_PATTERNS) {
    const match = name.match(pattern);
    if (match?.[1]?.trim() && match[2]?.trim()) {
      return { name: match[1].trim(), prep: match[2].trim() };
    }
  }
  return { name };
}

function parseNumericAmount(token: string): number | null {
  const mixed = token.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  }
  const fraction = token.match(/^(\d+)\/(\d+)$/);
  if (fraction) {
    return Number(fraction[1]) / Number(fraction[2]);
  }
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

/**
 * Parse a free-text ingredient line such as "1 tablespoon vegetable oil"
 * or "1/4 cup shredded Monterey Jack, divided".
 */
export function parseIngredientLine(line: string): RecipeIngredient | null {
  let rest = normalizeUnicodeFractions(line.trim()).replace(/\s+/g, " ");
  if (!rest) return null;

  const metricCan = rest.match(METRIC_CAN_RE);
  if (metricCan) {
    const weightNote = `${metricCan[1]}${metricCan[2].toLowerCase()}`;
    const refined = refineOneIngredient({
      name: metricCan[3].trim(),
      amount: 1,
      unit: "can",
      notes: weightNote,
    });
    return refined[0] ?? null;
  }

  let amount: number | null = null;
  const amountMatch = rest.match(/^(?:(\d+)\s+(\d+\/\d+)|(\d+\/\d+)|(\d+(?:\.\d+)?))\s+/);
  if (amountMatch) {
    if (amountMatch[1] && amountMatch[2]) {
      amount = parseNumericAmount(`${amountMatch[1]} ${amountMatch[2]}`);
    } else if (amountMatch[3]) {
      amount = parseNumericAmount(amountMatch[3]);
    } else if (amountMatch[4]) {
      amount = parseNumericAmount(amountMatch[4]);
    }
    rest = rest.slice(amountMatch[0].length).trim();
  }

  let unit: string | null = null;
  const unitMatch = rest.match(LEADING_UNIT_RE);
  if (unitMatch) {
    unit = cleanExtractedUnit(unitMatch[1].replace(/\.$/, ""));
    rest = rest.slice(unitMatch[0].length).trim();
  }

  rest = rest.replace(/^of\s+/i, "").trim();

  if (!rest) return null;

  const refined = refineOneIngredient({ name: rest, amount, unit, notes: undefined });
  return refined[0] ?? null;
}

function isPrepOnly(part: string): boolean {
  return PREP_ONLY_RE.test(part.trim());
}

/**
 * Split model mistakes like "beef, onion, chili powder" into separate ingredients,
 * and move prep phrases into `notes`.
 */
export function refineExtractedIngredients(ingredients: RecipeIngredient[]): RecipeIngredient[] {
  return ingredients.flatMap((ingredient) => refineOneIngredient(ingredient));
}

function refineOneIngredient(ingredient: RecipeIngredient): RecipeIngredient[] {
  let name = ingredient.name.trim().toLowerCase().replace(/\s+/g, " ");
  if (!name) return [];

  let notes = ingredient.notes?.trim() || undefined;
  const amount = ingredient.amount;
  let unit = cleanExtractedUnit(ingredient.unit);

  const suffixPrep = name.match(PREP_SUFFIX_RE);
  if (suffixPrep) {
    name = suffixPrep[1].trim();
    const prep = [suffixPrep[2]?.trim(), suffixPrep[3]?.trim()].filter(Boolean).join(" ");
    notes = joinNotes(notes, prep);
    return refineOneIngredient({ name, amount, unit, notes });
  }

  const sizePiece = name.match(SIZE_PIECE_RE);
  if (sizePiece) {
    name = sizePiece[2].trim();
    notes = joinNotes(notes, `${sizePiece[1]} piece`);
    return refineOneIngredient({ name, amount, unit, notes });
  }

  const trailingPrep = peelTrailingPrepWithoutComma(name);
  if (trailingPrep.prep) {
    name = trailingPrep.name;
    notes = joinNotes(notes, trailingPrep.prep);
    return refineOneIngredient({ name, amount, unit, notes });
  }

  if (name.includes(",")) {
    const parts = name
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length === 2 && !isPrepOnly(parts[1])) {
      const second = parts[1];
      const looksLikePrepNote =
        /(?:finely|roughly|thinly|stalks|picked|chopped|diced|minced|drained|rinsed|peeled|juiced|serve)/i.test(
          second,
        );
      if (looksLikePrepNote) {
        name = parts[0];
        notes = joinNotes(notes, second);
        return refineOneIngredient({ name, amount, unit, notes });
      }
    }
  }

  if (name.includes(",")) {
    const parts = name
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);

    if (parts.length >= 2 && parts.every((part) => !isPrepOnly(part))) {
      // Amounts on merged rows are unreliable — drop them when splitting.
      return parts.flatMap((part) =>
        refineOneIngredient({ name: part, amount: null, unit: null, notes: undefined }),
      );
    }
  }

  const prefixPrep = name.match(PREP_PREFIX_RE);
  if (prefixPrep) {
    const prep = [prefixPrep[1]?.trim(), prefixPrep[2]?.trim()].filter(Boolean).join(" ");
    name = prefixPrep[3].trim();
    notes = joinNotes(notes, prep);
  }

  // "3 garlic cloves" with no explicit unit → peel trailing clove(s).
  if (!unit) {
    const cloveMatch = name.match(/^(.*?)\s+cloves?$/i);
    if (cloveMatch?.[1]) {
      name = cloveMatch[1].trim();
      unit = "clove";
    }
  }

  return [{ name, amount, unit, notes }];
}
