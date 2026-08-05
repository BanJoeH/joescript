import { formatAmount, formatAmountWithUnit, normalizeUnit, SUGGESTED_UNITS } from "./units";

export type ParsedQuantity = {
  amount: number | null;
  unit: string | null;
  unitPrefix: string;
  complete: boolean;
};

export type QuantityCompletion = {
  suggestions: string[];
  /** Text appended after the user's input for inline ghost completion. */
  completionSuffix: string;
  /** Fully resolved string if the top suggestion were accepted. */
  completedValue: string;
};

const UNIT_ALIASES: Record<string, string> = {
  g: "g",
  gram: "g",
  grams: "g",
  kg: "kg",
  kilogram: "kg",
  kilograms: "kg",
  ml: "ml",
  milliliter: "ml",
  millilitre: "ml",
  milliliters: "ml",
  millilitres: "ml",
  l: "l",
  liter: "l",
  litre: "l",
  liters: "l",
  litres: "l",
  tsp: "tsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  tbsp: "tbsp",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  cup: "cup",
  cups: "cup",
  oz: "oz",
  ounce: "oz",
  ounces: "oz",
  lb: "lb",
  lbs: "lb",
  pound: "lb",
  pounds: "lb",
  clove: "clove",
  cloves: "clove",
  can: "can",
  cans: "can",
  pinch: "pinch",
  pinches: "pinch",
  pack: "pack",
  packs: "pack",
  bunch: "bunch",
  bunches: "bunch",
  dash: "dash",
  handful: "handful",
  handfuls: "handful",
  slice: "slice",
  slices: "slice",
  stick: "stick",
  sticks: "stick",
  each: "each",
};

const PREFIX_TERMS: Array<{ term: string; canonical: string }> = (() => {
  const entries: Array<{ term: string; canonical: string }> = [];
  const seen = new Set<string>();

  for (const unit of SUGGESTED_UNITS) {
    entries.push({ term: unit, canonical: unit });
    seen.add(unit);
  }

  for (const [alias, canonical] of Object.entries(UNIT_ALIASES)) {
    const key = `${alias}:${canonical}`;
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({ term: alias, canonical });
  }

  return entries;
})();

const AMOUNT_RE = /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(.*)$/;

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

function isKnownCanonical(unit: string): boolean {
  return (SUGGESTED_UNITS as readonly string[]).includes(unit);
}

function resolveExactUnit(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  const lower = trimmed.toLowerCase();
  const aliased = UNIT_ALIASES[lower] ?? normalizeUnit(lower);
  if (aliased && isKnownCanonical(aliased)) {
    return aliased;
  }

  if (lower.endsWith("s")) {
    const singular = UNIT_ALIASES[lower.slice(0, -1)] ?? normalizeUnit(lower.slice(0, -1));
    if (singular && isKnownCanonical(singular)) {
      return singular;
    }
  }

  if (isKnownCanonical(lower)) {
    return lower;
  }

  return null;
}

/** Parse a quantity-only string such as `300g`, `3 cloves`, or `1/2 cup`. */
export function parseQuantityString(raw: string): ParsedQuantity {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { amount: null, unit: null, unitPrefix: "", complete: true };
  }

  const match = trimmed.match(AMOUNT_RE);
  if (!match) {
    return { amount: null, unit: null, unitPrefix: trimmed, complete: false };
  }

  const amount = parseNumericAmount(match[1]);
  if (amount === null) {
    return { amount: null, unit: null, unitPrefix: trimmed, complete: false };
  }

  const unitPart = match[2] ?? "";
  if (!unitPart) {
    return { amount, unit: null, unitPrefix: "", complete: true };
  }

  const resolved = resolveExactUnit(unitPart);
  if (resolved) {
    return { amount, unit: resolved, unitPrefix: unitPart, complete: true };
  }

  return { amount, unit: null, unitPrefix: unitPart, complete: false };
}

function suggestedUnitRank(unit: string): number {
  const index = (SUGGESTED_UNITS as readonly string[]).indexOf(unit);
  return index === -1 ? 999 : index;
}

/** Unit suggestions for a partial unit prefix such as `c` or `cl`. */
export function completeUnitPrefix(prefix: string): string[] {
  const query = prefix.trim().toLowerCase();
  if (!query) {
    return [...SUGGESTED_UNITS];
  }

  const seen = new Set<string>();
  const results: string[] = [];

  for (const { term, canonical } of PREFIX_TERMS) {
    if (!term.startsWith(query) || seen.has(canonical)) {
      continue;
    }
    seen.add(canonical);
    results.push(canonical);
  }

  return results.sort((left, right) => suggestedUnitRank(left) - suggestedUnitRank(right));
}

/** Format `{ amount, unit }` for display inside the combined input. */
export function formatQuantityString(amount: number | null, unit: string | null): string {
  if (amount === null) {
    return "";
  }

  if (!unit) {
    return formatAmount(amount);
  }

  return formatAmountWithUnit(amount, unit);
}

/** Build a canonical quantity string after picking a unit suggestion. */
export function buildQuantityString(amount: number, unit: string): string {
  return formatQuantityString(amount, unit);
}

/** Inline completion state for the quantity input, if any. */
export function getQuantityCompletion(raw: string): QuantityCompletion | null {
  const parsed = parseQuantityString(raw);
  if (parsed.complete || parsed.amount === null || !parsed.unitPrefix) {
    return null;
  }

  const suggestions = completeUnitPrefix(parsed.unitPrefix);
  if (suggestions.length === 0) {
    return null;
  }

  const best = suggestions[0];
  const prefixLower = parsed.unitPrefix.toLowerCase();
  if (!best.toLowerCase().startsWith(prefixLower)) {
    return null;
  }

  const completionSuffix = best.slice(parsed.unitPrefix.length);

  return {
    suggestions,
    completionSuffix,
    completedValue: buildQuantityString(parsed.amount, best),
  };
}

/** Commit a raw string to structured `{ amount, unit }`. */
export function commitQuantityString(raw: string): { amount: number | null; unit: string | null } {
  const parsed = parseQuantityString(raw.trim());
  if (parsed.complete) {
    return { amount: parsed.amount, unit: parsed.unit };
  }

  if (parsed.amount !== null && parsed.unitPrefix) {
    const suggestions = completeUnitPrefix(parsed.unitPrefix);
    if (suggestions.length === 1) {
      return { amount: parsed.amount, unit: suggestions[0] };
    }
  }

  return { amount: parsed.amount, unit: parsed.unit };
}
