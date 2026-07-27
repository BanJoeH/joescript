import { describe, expect, it } from "vitest";

import { getIngredientSection, groupBySection } from "./ingredient-sections";

describe("getIngredientSection", () => {
  it("classifies common produce", () => {
    expect(getIngredientSection("green beans")).toBe("Produce");
    expect(getIngredientSection("potatoes")).toBe("Produce");
    expect(getIngredientSection("tomatoes")).toBe("Produce");
    expect(getIngredientSection("cress")).toBe("Produce");
    expect(getIngredientSection("salad")).toBe("Produce");
  });

  it("classifies common meat, dairy, bakery, pantry and household items", () => {
    expect(getIngredientSection("anchovies")).toBe("Meat & Fish");
    expect(getIngredientSection("chicken thighs")).toBe("Meat & Fish");
    expect(getIngredientSection("pancetta")).toBe("Meat & Fish");
    expect(getIngredientSection("mozzarella")).toBe("Dairy & Eggs");
    expect(getIngredientSection("garlic bread")).toBe("Bakery");
    expect(getIngredientSection("bay leaf")).toBe("Pantry");
    expect(getIngredientSection("chicken stock")).toBe("Pantry");
    expect(getIngredientSection("chopped tomatoes")).toBe("Pantry");
    expect(getIngredientSection("dijon mustar")).toBe("Pantry");
    expect(getIngredientSection("macaroni")).toBe("Pantry");
    expect(getIngredientSection("rice")).toBe("Pantry");
    expect(getIngredientSection("foil")).toBe("Household");
  });

  it("classifies freezer staples", () => {
    expect(getIngredientSection("pizza")).toBe("Frozen");
  });

  it("falls back to Other when there is no known match", () => {
    expect(getIngredientSection("mystery ingredient")).toBe("Other");
  });

  it("prefers user category overrides over built-in guesses", () => {
    expect(getIngredientSection("chicken thighs", { "chicken thigh": "Pantry" })).toBe("Pantry");
  });

  it("applies user category overrides using the canonical singular key", () => {
    expect(getIngredientSection("onions", { onion: "Pantry" })).toBe("Pantry");
  });
});

describe("groupBySection", () => {
  const name = (item: { name: string }) => item.name;

  it("groups items by grocery section order", () => {
    expect(
      groupBySection(
        [{ name: "foil" }, { name: "chicken" }, { name: "broccoli" }, { name: "rice" }],
        name,
      ),
    ).toEqual([
      { section: "Produce", items: [{ name: "broccoli" }] },
      { section: "Meat & Fish", items: [{ name: "chicken" }] },
      { section: "Pantry", items: [{ name: "rice" }] },
      { section: "Household", items: [{ name: "foil" }] },
    ]);
  });

  it("groups using user category overrides", () => {
    expect(
      groupBySection([{ name: "onions" }, { name: "rice" }], name, { onion: "Pantry" }),
    ).toEqual([{ section: "Pantry", items: [{ name: "onions" }, { name: "rice" }] }]);
  });
});
