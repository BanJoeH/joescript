import { describe, expect, it } from "vitest";

import { normalizeExtracted } from "~/services/extract.server";

describe("normalizeExtracted (photo / structure JSON)", () => {
  it("keeps description from model JSON when present", () => {
    expect(
      normalizeExtracted({
        name: "Banana bread",
        description: "  A moist loaf from the cookbook intro.  ",
        servings: 8,
        ingredients: [{ name: "flour", amount: 2, unit: "cup" }],
        steps: [{ order: 1, text: "Mix and bake." }],
      }),
    ).toMatchObject({
      name: "Banana bread",
      description: "A moist loaf from the cookbook intro.",
      servings: 8,
    });
  });

  it("re-parses vision ingredients that embed amounts in name", () => {
    expect(
      normalizeExtracted({
        name: "Stew",
        ingredients: [{ name: "2 tbsp olive oil", amount: null, unit: null }],
        steps: [{ order: 1, text: "Cook." }],
      }).ingredients[0],
    ).toEqual({
      name: "olive oil",
      amount: 2,
      unit: "tbsp",
    });
  });

  it("omits blank description", () => {
    expect(
      normalizeExtracted({
        name: "Toast",
        description: "   ",
        ingredients: [{ name: "bread", amount: 2, unit: null }],
        steps: [{ order: 1, text: "Toast it." }],
      }).description,
    ).toBeUndefined();
  });
});
