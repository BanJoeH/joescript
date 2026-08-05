import { getCanonicalIngredientName } from "./ingredient-name";
import {
  convertWithinDimension,
  formatAmountWithUnit,
  getUnitDimension,
  normalizeAggregatedAmount,
  normalizeUnit,
  preferredDisplayUnit,
  type UnitDimension,
} from "./units";

export type ShoppingLine = {
  name: string;
  amount: number | null;
  unit: string | null;
  purchased: boolean;
  source: string;
};

export type AggregatedAmount = {
  amount: number;
  /** `null` means a plain count ("each"). */
  unit: string | null;
};

/** One shopping-list line rolled into an aggregated row. */
export type AggregatedInstance = {
  key: string;
  source: string;
  amount: number | null;
  unit: string | null;
  purchased: boolean;
  /** Human-readable quantity for this line, e.g. "2 cloves", "500g", or "—". */
  quantityText: string;
};

/**
 * One row in the sorted-shopping view: every instance of an ingredient name
 * across recipes and odd bits, aggregated into as few quantity lines as
 * possible. Amounts that share a unit dimension (e.g. g/kg) are summed into a
 * single converted total; incompatible dimensions (e.g. g and each) become
 * separate entries in `amounts`, and `quantityLabel` renders the split
 * (e.g. "500g + 3\u00d7").
 */
export type AggregatedIngredient = {
  canonicalName: string;
  name: string;
  sources: string[];
  /** True only when every underlying instance has been marked purchased. */
  purchased: boolean;
  purchasedCount: number;
  instanceCount: number;
  instances: AggregatedInstance[];
  amounts: AggregatedAmount[];
  quantityLabel: string;
};

const DIMENSION_ORDER: UnitDimension[] = ["mass", "volume", "count"];

function formatInstanceQuantity(line: Pick<ShoppingLine, "amount" | "unit">): string {
  if (line.amount === null) {
    return "—";
  }

  return formatAmountWithUnit(line.amount, line.unit);
}

function uniqueSourceCount(item: AggregatedIngredient): number {
  return new Set(item.sources).size;
}

function hasUnspecifiedInstances(item: AggregatedIngredient): boolean {
  return item.instances.some((instance) => instance.amount === null);
}

/** Every instance has an amount and aggregation produced a single total. */
function hasCleanAggregation(item: AggregatedIngredient): boolean {
  if (hasUnspecifiedInstances(item) || item.amounts.length !== 1) {
    return false;
  }

  return item.instances.every((instance) => instance.amount !== null);
}

function isPartiallyPurchased(item: AggregatedIngredient): boolean {
  return item.purchasedCount > 0 && item.purchasedCount < item.instanceCount;
}

function withPartialProgress(item: AggregatedIngredient, label: string | null): string | null {
  if (!isPartiallyPurchased(item)) {
    return label;
  }

  const progress = `${item.purchasedCount}/${item.instanceCount}`;
  return label ? `${progress} · ${label}` : progress;
}

/**
 * Badge text for the sorted list row.
 * - Single recipe with amount → that amount (e.g. "2 cloves", "500g")
 * - Single recipe, no amount → nothing
 * - Multiple recipes, clean sum → total (e.g. "1kg", "5 cloves")
 * - Multiple recipes, messy data → recipe count (e.g. "3 recipes")
 * - Partial progress prepends "1/3 ·" when some instances are purchased
 */
export function getSortedQuantityBadge(item: AggregatedIngredient): string | null {
  const recipeCount = uniqueSourceCount(item);

  if (recipeCount === 1) {
    if (item.instances.every((instance) => instance.amount === null)) {
      return withPartialProgress(item, null);
    }

    if (hasCleanAggregation(item)) {
      const [amount] = item.amounts;
      return withPartialProgress(item, formatAmountWithUnit(amount.amount, amount.unit));
    }

    return withPartialProgress(item, formatQuantityLabel(item.amounts) || null);
  }

  if (!hasCleanAggregation(item)) {
    return withPartialProgress(item, `${recipeCount} recipes`);
  }

  const [amount] = item.amounts;
  return withPartialProgress(item, formatAmountWithUnit(amount.amount, amount.unit));
}

function formatQuantityLabel(amounts: AggregatedAmount[]): string {
  if (amounts.length === 0) return "";
  return amounts.map(({ amount, unit }) => formatAmountWithUnit(amount, unit)).join(" + ");
}

function sharedCountDisplayUnit(lines: ShoppingLine[]): string | null {
  const numericLines = lines.filter(
    (line): line is ShoppingLine & { amount: number } => line.amount !== null,
  );
  if (numericLines.length === 0) {
    return null;
  }

  const normalized = numericLines.map((line) => normalizeUnit(line.unit));
  const unique = new Set(normalized.map((unit) => unit ?? "__none__"));
  if (unique.size !== 1) {
    return null;
  }

  const unit = normalized[0];
  if (!unit || unit === "each") {
    return null;
  }

  return unit;
}

function aggregateDimensionBucket(
  dimension: UnitDimension,
  lines: ShoppingLine[],
): AggregatedAmount[] {
  const numericLines = lines.filter(
    (line): line is ShoppingLine & { amount: number } => line.amount !== null,
  );
  const unspecifiedCount = lines.length - numericLines.length;
  const result: AggregatedAmount[] = [];

  if (numericLines.length > 0) {
    const displayUnit =
      dimension === "count"
        ? sharedCountDisplayUnit(lines)
        : preferredDisplayUnit(
            dimension,
            numericLines.map((line) => line.unit),
          );
    const total = numericLines.reduce((sum, line) => {
      const converted = convertWithinDimension(line.amount, line.unit, displayUnit);
      return sum + (converted ?? line.amount);
    }, 0);
    result.push(normalizeAggregatedAmount(total, displayUnit, dimension));
  }

  if (unspecifiedCount > 0) {
    result.push({ amount: unspecifiedCount, unit: null });
  }

  return result;
}

/**
 * Aggregate every ingredient instance across shopping recipes and odd bits
 * into one row per canonical name, summing compatible-unit amounts and
 * tracking which sources (recipe names, "Odd Bits") contributed each line.
 * A row is `purchased` only once every underlying instance is.
 */
export function aggregateIngredients(lines: ShoppingLine[]): AggregatedIngredient[] {
  const groups = new Map<string, ShoppingLine[]>();
  const order: string[] = [];

  for (const line of lines) {
    const key = getCanonicalIngredientName(line.name);
    const existing = groups.get(key);
    if (existing) {
      existing.push(line);
    } else {
      groups.set(key, [line]);
      order.push(key);
    }
  }

  const result = order.map((canonicalName) => {
    const groupLines = groups.get(canonicalName) as ShoppingLine[];

    const buckets = new Map<UnitDimension, ShoppingLine[]>();
    for (const line of groupLines) {
      const dimension = getUnitDimension(line.unit);
      const bucket = buckets.get(dimension);
      if (bucket) {
        bucket.push(line);
      } else {
        buckets.set(dimension, [line]);
      }
    }

    const amounts = DIMENSION_ORDER.flatMap((dimension) => {
      const bucketLines = buckets.get(dimension);
      return bucketLines ? aggregateDimensionBucket(dimension, bucketLines) : [];
    });

    const instances = groupLines.map((line, index) => ({
      key: `${line.source}:${line.amount ?? "null"}:${line.unit ?? "null"}:${line.purchased}:${index}`,
      source: line.source,
      amount: line.amount,
      unit: line.unit,
      purchased: line.purchased,
      quantityText: formatInstanceQuantity(line),
    }));

    return {
      canonicalName,
      name: groupLines[0].name.toLowerCase().trim(),
      sources: groupLines.map((line) => line.source),
      purchased: groupLines.every((line) => line.purchased),
      purchasedCount: groupLines.filter((line) => line.purchased).length,
      instanceCount: groupLines.length,
      instances,
      amounts,
      quantityLabel: formatQuantityLabel(amounts),
    } satisfies AggregatedIngredient;
  });

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
