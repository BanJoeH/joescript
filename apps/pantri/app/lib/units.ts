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
  kilo: { canonical: "kg", dimension: "mass", toBase: 1000 },
  kilogram: { canonical: "kg", dimension: "mass", toBase: 1000 },
  kilograms: { canonical: "kg", dimension: "mass", toBase: 1000 },
  oz: { canonical: "oz", dimension: "mass", toBase: 28.3495 },
  ounce: { canonical: "oz", dimension: "mass", toBase: 28.3495 },
  ounces: { canonical: "oz", dimension: "mass", toBase: 28.3495 },
  lb: { canonical: "lb", dimension: "mass", toBase: 453.592 },
  lbs: { canonical: "lb", dimension: "mass", toBase: 453.592 },
  pound: { canonical: "lb", dimension: "mass", toBase: 453.592 },
  pounds: { canonical: "lb", dimension: "mass", toBase: 453.592 },
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
  if (dimension === "mass") {
    if (normalized.includes("kg")) return "kg";
    if (normalized.includes("lb")) return "lb";
    const hasMetric = normalized.some((unit) => unit === "g" || unit === "kg");
    const hasImperial = normalized.some((unit) => unit === "oz" || unit === "lb");
    if (hasMetric) return "g";
    if (hasImperial) return normalized.includes("lb") ? "lb" : "oz";
    return "g";
  }
  if (dimension === "volume") {
    if (normalized.includes("l")) return "l";
    if (normalized.includes("cup")) return "cup";
    if (normalized.includes("tbsp")) return "tbsp";
    if (normalized.includes("tsp")) return "tsp";
    return "ml";
  }
  return null;
}

/** Round an amount for shopping display based on the unit's typical precision. */
export function roundAmountForUnit(amount: number, unit: string | null | undefined): number {
  const normalized = normalizeUnit(unit);
  if (!normalized || normalized === "each") {
    return Math.round(amount);
  }

  switch (normalized) {
    case "g":
    case "ml":
    case "oz":
      return Math.round(amount);
    case "kg":
    case "l":
    case "lb":
      return Math.round(amount * 100) / 100;
    case "tsp":
    case "tbsp":
    case "cup":
      return Math.round(amount * 4) / 4;
    default:
      if (getUnitDimension(normalized) === "count") {
        return Math.round(amount);
      }
      return Math.round(amount * 100) / 100;
  }
}

/**
 * Pick a readable unit/amount for aggregated shopping totals — upgrades g→kg,
 * ml→l, oz→lb when thresholds are crossed, then rounds for display.
 */
export function normalizeAggregatedAmount(
  amount: number,
  unit: string | null,
  dimension: UnitDimension,
): { amount: number; unit: string | null } {
  if (unit === null) {
    return { amount: Math.round(amount), unit: null };
  }

  let currentAmount = amount;
  let currentUnit = normalizeUnit(unit) ?? unit;

  if (dimension === "mass") {
    if (currentUnit === "g" && currentAmount >= 1000) {
      currentAmount /= 1000;
      currentUnit = "kg";
    } else if (currentUnit === "oz" && currentAmount >= 16) {
      currentAmount /= 16;
      currentUnit = "lb";
    }
  } else if (dimension === "volume" && currentUnit === "ml" && currentAmount >= 1000) {
    currentAmount /= 1000;
    currentUnit = "l";
  }

  return {
    amount: roundAmountForUnit(currentAmount, currentUnit),
    unit: currentUnit,
  };
}

export function formatAmount(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

const ATTACHED_UNITS = new Set(["g", "kg", "ml", "l", "oz", "lb"]);

function pluralizeCountUnit(unit: string, amount: number): string {
  if (amount === 1 || unit.endsWith("s")) {
    return unit;
  }
  return `${unit}s`;
}

/** Render an amount and unit for display, e.g. "500g", "2 cloves", "3×". */
export function formatAmountWithUnit(amount: number, unit: string | null | undefined): string {
  const normalized = normalizeUnit(unit);
  if (!normalized || normalized === "each") {
    return `${formatAmount(amount)}×`;
  }

  if (getUnitDimension(normalized) === "count") {
    return `${formatAmount(amount)} ${pluralizeCountUnit(normalized, amount)}`;
  }

  if (ATTACHED_UNITS.has(normalized)) {
    return `${formatAmount(amount)}${normalized}`;
  }

  return `${formatAmount(amount)} ${normalized}`;
}
