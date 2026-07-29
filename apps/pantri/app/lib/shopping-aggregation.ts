import { getCanonicalIngredientName } from "./ingredient-name";
import {
  convertWithinDimension,
  formatAmount,
  getUnitDimension,
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
  amounts: AggregatedAmount[];
  quantityLabel: string;
};

const DIMENSION_ORDER: UnitDimension[] = ["mass", "volume", "count"];

function formatQuantityLabel(amounts: AggregatedAmount[]): string {
  if (amounts.length === 0) return "";
  return amounts
    .map(({ amount, unit }) =>
      unit ? `${formatAmount(amount)}${unit}` : `${formatAmount(amount)}\u00d7`,
    )
    .join(" + ");
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
        ? null
        : preferredDisplayUnit(
            dimension,
            numericLines.map((l) => l.unit),
          );
    const total = numericLines.reduce((sum, line) => {
      const converted = convertWithinDimension(line.amount, line.unit, displayUnit);
      return sum + (converted ?? line.amount);
    }, 0);
    result.push({ amount: Math.round(total * 100) / 100, unit: displayUnit });
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

    return {
      canonicalName,
      name: groupLines[0].name.toLowerCase().trim(),
      sources: groupLines.map((line) => line.source),
      purchased: groupLines.every((line) => line.purchased),
      amounts,
      quantityLabel: formatQuantityLabel(amounts),
    } satisfies AggregatedIngredient;
  });

  return result.sort((a, b) => a.name.localeCompare(b.name));
}
