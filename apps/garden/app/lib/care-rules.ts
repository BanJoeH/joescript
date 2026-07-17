export function parseCareRuleMonths(monthsJson: string) {
  try {
    const parsed = JSON.parse(monthsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((month): month is number => typeof month === "number");
  } catch {
    return [];
  }
}

/** Months until the next occurrence of any listed month (0 = this month). */
export function monthsUntilNextCareMonth(
  months: number[],
  currentMonth = new Date().getMonth() + 1,
) {
  if (months.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.min(...months.map((month) => (month - currentMonth + 12) % 12));
}

type CareRuleSortable = {
  active: boolean;
  monthsJson: string;
  taskType: string;
};

/** Active rules soonest first; inactive last. Ties break by task type. */
export function sortCareRulesBySoonest<T extends CareRuleSortable>(
  rules: T[],
  currentMonth = new Date().getMonth() + 1,
): T[] {
  return [...rules].sort((a, b) => {
    if (a.active !== b.active) {
      return a.active ? -1 : 1;
    }

    const aSoon = monthsUntilNextCareMonth(parseCareRuleMonths(a.monthsJson), currentMonth);
    const bSoon = monthsUntilNextCareMonth(parseCareRuleMonths(b.monthsJson), currentMonth);
    if (aSoon !== bSoon) {
      return aSoon - bSoon;
    }

    return a.taskType.localeCompare(b.taskType);
  });
}
