export type UnitDimension = "mass" | "volume" | "count";

type UnitDefinition = {
  /** Canonical short form, e.g. "g", "kg", "ml", "l", "each". */
  canonical: string;
  dimension: UnitDimension;
  /** Multiplier to convert an amount in this unit to the dimension's base unit. */
  toBase: number;
};

/** Base units: grams for mass, millilitres for volume, "each" for count. */
const UNIT_DEFINITIONS: Record<string, UnitDefinition> = {
  g: { canonical: "g", dimension: "mass", toBase: 1 },
  gram: { canonical: "g", dimension: "mass", toBase: 1 },
  grams: { canonical: "g", dimension: "mass", toBase: 1 },
  kg: { canonical: "kg", dimension: "mass", toBase: 1000 },
  kilogram: { canonical: "kg", dimension: "mass", toBase: 1000 },
  kilograms: { canonical: "kg", dimension: "mass", toBase: 1000 },
  ml: { canonical: "ml", dimension: "volume", toBase: 1 },
  millilitre: { canonical: "ml", dimension: "volume", toBase: 1 },
  millilitres: { canonical: "ml", dimension: "volume", toBase: 1 },
  milliliter: { canonical: "ml", dimension: "volume", toBase: 1 },
  milliliters: { canonical: "ml", dimension: "volume", toBase: 1 },
  l: { canonical: "l", dimension: "volume", toBase: 1000 },
  litre: { canonical: "l", dimension: "volume", toBase: 1000 },
  litres: { canonical: "l", dimension: "volume", toBase: 1000 },
  liter: { canonical: "l", dimension: "volume", toBase: 1000 },
  liters: { canonical: "l", dimension: "volume", toBase: 1000 },
  tsp: { canonical: "tsp", dimension: "volume", toBase: 5 },
  teaspoon: { canonical: "tsp", dimension: "volume", toBase: 5 },
  teaspoons: { canonical: "tsp", dimension: "volume", toBase: 5 },
  tbsp: { canonical: "tbsp", dimension: "volume", toBase: 15 },
  tablespoon: { canonical: "tbsp", dimension: "volume", toBase: 15 },
  tablespoons: { canonical: "tbsp", dimension: "volume", toBase: 15 },
  cup: { canonical: "cup", dimension: "volume", toBase: 240 },
  cups: { canonical: "cup", dimension: "volume", toBase: 240 },
  each: { canonical: "each", dimension: "count", toBase: 1 },
};

/**
 * Units offered in free-solo pickers. Prefer short canonical forms that also
 * appear in `UNIT_DEFINITIONS` when conversion matters; cooking count units
 * (clove, can, …) are included even though they stay "count" dimensionally.
 */
export const SUGGESTED_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "tsp",
  "tbsp",
  "cup",
  "oz",
  "lb",
  "clove",
  "can",
  "pinch",
  "pack",
  "bunch",
  "dash",
  "handful",
  "slice",
  "stick",
  "each",
] as const;

/** Normalize a free-text unit to its canonical short form, or `null` for a unitless count. */
export function normalizeUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const key = unit.trim().toLowerCase();
  if (!key) return null;
  return UNIT_DEFINITIONS[key]?.canonical ?? key;
}

export function getUnitDimension(unit: string | null | undefined): UnitDimension {
  const normalized = normalizeUnit(unit);
  if (normalized === null) return "count";
  return UNIT_DEFINITIONS[normalized]?.dimension ?? "count";
}

/**
 * Convert `amount` from `fromUnit` to `toUnit` when both fall in the same
 * dimension (e.g. g <-> kg, ml <-> l). Returns `null` when the units are
 * incompatible (different dimensions, or an unrecognised unit), in which case
 * callers should keep the amounts as separate display lines.
 */
export function convertWithinDimension(
  amount: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
): number | null {
  const fromNormalized = normalizeUnit(fromUnit);
  const toNormalized = normalizeUnit(toUnit);

  if (fromNormalized === toNormalized) {
    return amount;
  }

  const fromDef = fromNormalized ? UNIT_DEFINITIONS[fromNormalized] : undefined;
  const toDef = toNormalized ? UNIT_DEFINITIONS[toNormalized] : undefined;

  if (!fromDef || !toDef || fromDef.dimension !== toDef.dimension) {
    return null;
  }

  const amountInBase = amount * fromDef.toBase;
  return amountInBase / toDef.toBase;
}

/** Pick the larger/more readable unit for a dimension to use when aggregating amounts. */
export function preferredDisplayUnit(
  dimension: UnitDimension,
  units: (string | null)[],
): string | null {
  const normalized = units.map((unit) => normalizeUnit(unit));
  if (dimension === "count") return null;
  if (dimension === "mass") return normalized.includes("kg") ? "kg" : "g";
  if (dimension === "volume") {
    if (normalized.includes("l")) return "l";
    if (normalized.includes("cup")) return "cup";
    if (normalized.includes("tbsp")) return "tbsp";
    if (normalized.includes("tsp")) return "tsp";
    return "ml";
  }
  return null;
}

export function formatAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
