export function parseCareRuleMonths(monthsJson: string) {
  try {
    const parsed = JSON.parse(monthsJson) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((month): month is number => typeof month === "number");
  } catch {
    return [];
  }
}
