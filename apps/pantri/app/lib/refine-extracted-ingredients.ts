import type { RecipeIngredient } from "~/lib/recipe-schema";

const PREP_WORDS =
  "diced|minced|chopped|sliced|crushed|grated|shredded|drained|divided|peeled|seeded|softened|melted|room temperature";

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
  /^(tablespoons?|teaspoons?|tbsp\.?|tsp\.?|cups?|pounds?|lbs?\.?|ounces?|oz\.?|grams?|kg|ml|l|liters?|litres?|cloves?|tins?|cans?)\b\s*/i;

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
  let rest = line.trim().replace(/\s+/g, " ");
  if (!rest) return null;

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
