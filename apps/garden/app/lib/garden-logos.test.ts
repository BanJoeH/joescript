import { describe, expect, it } from "vitest";

import { gardenLogoForLocation } from "./garden-logos";

describe("gardenLogoForLocation", () => {
  it("returns the dashboard plant for the household root", () => {
    expect(gardenLogoForLocation({ pathname: "/hh-1" })).toBe("/happy_plant_01.png");
  });

  it("maps household sections by their first path segment", () => {
    expect(gardenLogoForLocation({ pathname: "/hh-1/plants" })).toBe("/happy_plant_02.png");
    expect(gardenLogoForLocation({ pathname: "/hh-1/plants/plant-9" })).toBe("/happy_plant_02.png");
    expect(gardenLogoForLocation({ pathname: "/hh-1/areas" })).toBe("/happy_plant_03.png");
    expect(gardenLogoForLocation({ pathname: "/hh-1/journal/new" })).toBe("/happy_plant_04.png");
    expect(gardenLogoForLocation({ pathname: "/hh-1/settings/personal" })).toBe(
      "/happy_plant_05.png",
    );
  });

  it("prefers the settings plant when the sheet is open", () => {
    expect(gardenLogoForLocation({ pathname: "/hh-1/plants", settingsOpen: true })).toBe(
      "/happy_plant_05.png",
    );
  });

  it("maps non-household routes", () => {
    expect(gardenLogoForLocation({ pathname: "/login" })).toBe("/happy_plant_06.png");
    expect(gardenLogoForLocation({ pathname: "/households" })).toBe("/happy_plant_07.png");
    expect(gardenLogoForLocation({ pathname: "/admin/allowed-emails" })).toBe(
      "/happy_plant_08.png",
    );
  });

  it("falls back for unknown sections", () => {
    expect(gardenLogoForLocation({ pathname: "/" })).toBe("/happy_plant_09.png");
    expect(gardenLogoForLocation({ pathname: "/hh-1/unknown" })).toBe("/happy_plant_09.png");
  });
});
