import { describe, expect, it } from "vitest";

import {
  monthsUntilNextCareMonth,
  parseCareRuleMonths,
  sortCareRulesBySoonest,
} from "./care-rules";

describe("parseCareRuleMonths", () => {
  it("parses a valid months array", () => {
    expect(parseCareRuleMonths("[6,7]")).toEqual([6, 7]);
  });

  it("returns an empty array for invalid JSON", () => {
    expect(parseCareRuleMonths("not-json")).toEqual([]);
  });
});

describe("monthsUntilNextCareMonth", () => {
  it("returns 0 when a month is current", () => {
    expect(monthsUntilNextCareMonth([7], 7)).toBe(0);
    expect(monthsUntilNextCareMonth([6, 7], 7)).toBe(0);
  });

  it("wraps around the year", () => {
    expect(monthsUntilNextCareMonth([1], 11)).toBe(2);
    expect(monthsUntilNextCareMonth([12], 1)).toBe(11);
  });

  it("picks the soonest month", () => {
    expect(monthsUntilNextCareMonth([3, 9], 7)).toBe(2);
  });

  it("returns infinity when there are no months", () => {
    expect(monthsUntilNextCareMonth([], 7)).toBe(Number.POSITIVE_INFINITY);
  });
});

describe("sortCareRulesBySoonest", () => {
  it("orders active rules by soonest month, inactive last", () => {
    const sorted = sortCareRulesBySoonest(
      [
        { id: "a", active: true, monthsJson: "[9]", taskType: "Feed" },
        { id: "b", active: true, monthsJson: "[7]", taskType: "Deadhead" },
        { id: "c", active: false, monthsJson: "[7]", taskType: "Old" },
        { id: "d", active: true, monthsJson: "[6,7]", taskType: "Coppice" },
      ],
      7,
    );

    expect(sorted.map((rule) => rule.id)).toEqual(["d", "b", "a", "c"]);
  });
});
