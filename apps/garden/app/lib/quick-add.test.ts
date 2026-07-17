import { describe, expect, it } from "vitest";

import {
  areaCreateRedirectPath,
  parseAreaNewFlash,
  parsePlantNewFlash,
  plantCreateContinuePath,
  plantCreateDonePath,
  quickAddFlashMessage,
} from "~/lib/quick-add";

describe("areaCreateRedirectPath", () => {
  it("redirects to add another area with area saved flash", () => {
    expect(areaCreateRedirectPath("hh-1", "saveAndAddAnother", "area-1")).toMatch(
      /^\/hh-1\/areas\/new\?saved=area&t=\d+$/,
    );
  });

  it("redirects to add plants with from=area flash", () => {
    expect(areaCreateRedirectPath("hh-1", "saveAndAddPlants", "area-9")).toMatch(
      /^\/hh-1\/plants\/new\?areaId=area-9&from=area&t=\d+$/,
    );
  });

  it("redirects to the areas list on save", () => {
    expect(areaCreateRedirectPath("hh-1", "save", "area-1")).toBe("/hh-1/areas");
  });
});

describe("plantCreateContinuePath", () => {
  it("redirects with plant saved flash", () => {
    expect(plantCreateContinuePath("hh-1", "area-2")).toMatch(
      /^\/hh-1\/plants\/new\?areaId=area-2&saved=plant&t=\d+$/,
    );
  });
});

describe("plantCreateDonePath", () => {
  it("redirects to the plants list", () => {
    expect(plantCreateDonePath("hh-1")).toBe("/hh-1/plants");
  });
});

describe("parseAreaNewFlash", () => {
  it("reads area repeat flash from saved=area", () => {
    expect(parseAreaNewFlash(new URLSearchParams("saved=area"))).toEqual({ kind: "area-repeat" });
  });

  it("ignores plant or cross-flow params", () => {
    expect(parseAreaNewFlash(new URLSearchParams("saved=plant"))).toBeNull();
    expect(parseAreaNewFlash(new URLSearchParams("from=area"))).toBeNull();
  });
});

describe("parsePlantNewFlash", () => {
  const areas = [
    { id: "area-9", name: "Patio" },
    { id: "area-2", name: "Border" },
  ];

  it("reads plant repeat flash from saved=plant", () => {
    expect(parsePlantNewFlash(new URLSearchParams("saved=plant"), areas, "area-9")).toEqual({
      kind: "plant-repeat",
    });
  });

  it("reads plants-after-area flash from from=area", () => {
    expect(
      parsePlantNewFlash(new URLSearchParams("areaId=area-9&from=area"), areas, "area-9"),
    ).toEqual({
      kind: "plants-after-area",
      areaName: "Patio",
    });
  });

  it("does not treat saved=plant as area flow", () => {
    expect(
      parsePlantNewFlash(new URLSearchParams("saved=plant&from=area"), areas, "area-9"),
    ).toEqual({
      kind: "plant-repeat",
    });
  });
});

describe("quickAddFlashMessage", () => {
  it("returns copy for each flash kind", () => {
    expect(quickAddFlashMessage({ kind: "area-repeat" })).toBe(
      "Area saved. Add the next one below.",
    );
    expect(quickAddFlashMessage({ kind: "plant-repeat" })).toBe(
      "Plant saved. Add another below, or select Done.",
    );
    expect(quickAddFlashMessage({ kind: "plants-after-area", areaName: "Patio" })).toBe(
      "Patio is ready. Add plants below.",
    );
  });
});
