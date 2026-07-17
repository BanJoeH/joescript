import { describe, expect, it } from "vitest";

import {
  filterSuggestedAreaNames,
  isGettingStartedComplete,
  resolveDuplicatePlantForm,
} from "~/lib/onboarding";

describe("filterSuggestedAreaNames", () => {
  it("removes suggestions that already exist (case-insensitive)", () => {
    expect(filterSuggestedAreaNames(["Patio", "Shed"], ["Patio", "Border", "patio"])).toEqual([
      "Border",
    ]);
  });

  it("returns all suggestions when none exist", () => {
    expect(filterSuggestedAreaNames([])).toEqual([
      "Front garden",
      "Back garden",
      "Patio",
      "Border",
      "Vegetable patch",
      "Greenhouse",
    ]);
  });
});

describe("resolveDuplicatePlantForm", () => {
  const source = {
    areaId: "area-1",
    name: "Lavender",
    latinName: "Lavandula angustifolia",
    cultivar: "Hidcote",
  };

  it("defaults to the source area", () => {
    const result = resolveDuplicatePlantForm(source, [{ id: "area-1" }, { id: "area-2" }]);

    expect(result.defaultValues.areaId).toBe("area-1");
    expect(result.defaultValues.name).toBe("Lavender");
    expect(result.defaultValues.latinName).toBe("Lavandula angustifolia");
    expect(result.defaultValues.notes).toBe("");
  });

  it("uses the source area when it is the only one", () => {
    const result = resolveDuplicatePlantForm(source, [{ id: "area-1" }]);

    expect(result.defaultValues.areaId).toBe("area-1");
  });

  it("honours a preferred area id from the query string", () => {
    const result = resolveDuplicatePlantForm(
      source,
      [{ id: "area-1" }, { id: "area-2" }],
      "area-2",
    );

    expect(result.defaultValues.areaId).toBe("area-2");
  });
});

describe("isGettingStartedComplete", () => {
  it("requires journal, areas, and plants", () => {
    expect(isGettingStartedComplete({ areaCount: 1, plantCount: 1, journalCount: 0 })).toBe(false);
    expect(isGettingStartedComplete({ areaCount: 1, plantCount: 0, journalCount: 1 })).toBe(false);
    expect(isGettingStartedComplete({ areaCount: 0, plantCount: 1, journalCount: 1 })).toBe(false);
    expect(isGettingStartedComplete({ areaCount: 1, plantCount: 1, journalCount: 1 })).toBe(true);
  });
});
