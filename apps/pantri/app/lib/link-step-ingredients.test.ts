import { describe, expect, it } from "vitest";

import { getIngredientMatchPhrases, linkStepIngredients } from "./link-step-ingredients";

describe("getIngredientMatchPhrases", () => {
  it("includes full name and safe head alias for powdered spices", () => {
    expect(getIngredientMatchPhrases("cumin powder")).toEqual(
      expect.arrayContaining(["cumin powder", "cumin"]),
    );
    expect(getIngredientMatchPhrases("cumin powder")).not.toContain("powder");
  });

  it("includes last-word alias for produce, but not the color alone", () => {
    const phrases = getIngredientMatchPhrases("red onion");
    expect(phrases).toEqual(expect.arrayContaining(["red onion", "onion", "red onions", "onions"]));
    expect(phrases).not.toContain("red");
  });

  it("skips generic stock/oil last words as standalone aliases", () => {
    const stock = getIngredientMatchPhrases("chicken stock");
    expect(stock).toEqual(expect.arrayContaining(["chicken stock", "chicken"]));
    expect(stock).not.toContain("stock");

    const oil = getIngredientMatchPhrases("olive oil");
    expect(oil).toEqual(expect.arrayContaining(["olive oil", "olive"]));
    expect(oil).not.toContain("oil");
  });

  it("treats cheese as a qualifier so parmesan matches", () => {
    const phrases = getIngredientMatchPhrases("parmesan cheese");
    expect(phrases).toEqual(expect.arrayContaining(["parmesan cheese", "parmesan"]));
    expect(phrases).not.toContain("cheese");
  });

  it("aliases the head of dried chilli flakes", () => {
    const phrases = getIngredientMatchPhrases("dried chilli flakes");
    expect(phrases).toEqual(
      expect.arrayContaining(["dried chilli flakes", "chilli flakes", "chilli"]),
    );
    expect(phrases).not.toContain("flakes");
    expect(phrases).not.toContain("dried");
  });
});

describe("linkStepIngredients", () => {
  const ingredients = [
    { name: "cumin powder", amount: 1.5, unit: "tsp" },
    { name: "garlic", amount: 2, unit: "clove" },
    { name: "garlic powder", amount: 1, unit: "tsp" },
    { name: "red onion", amount: 1, unit: null },
    { name: "olive oil", amount: 2, unit: "tbsp" },
    { name: "parmesan cheese", amount: 30, unit: "g" },
  ];

  it("returns plain text when nothing matches", () => {
    expect(linkStepIngredients("Bring a large pot of water to a boil.", ingredients)).toEqual([
      { type: "text", text: "Bring a large pot of water to a boil." },
    ]);
  });

  it("links a short step reference to the longer ingredient name", () => {
    expect(linkStepIngredients("Toast the cumin until fragrant.", ingredients)).toEqual([
      { type: "text", text: "Toast the " },
      { type: "ingredient", text: "cumin", ingredientIndex: 0 },
      { type: "text", text: " until fragrant." },
    ]);
  });

  it("links Parmesan in steps to parmesan cheese", () => {
    expect(
      linkStepIngredients(
        "Finally grate the Parmesan, then top with a fine grating of Parmesan.",
        ingredients,
      ),
    ).toEqual([
      { type: "text", text: "Finally grate the " },
      { type: "ingredient", text: "Parmesan", ingredientIndex: 5 },
      { type: "text", text: ", then top with a fine grating of " },
      { type: "ingredient", text: "Parmesan", ingredientIndex: 5 },
      { type: "text", text: "." },
    ]);
  });

  it("prefers the longest phrase when garlic and garlic powder both exist", () => {
    expect(linkStepIngredients("Stir in the garlic powder.", ingredients)).toEqual([
      { type: "text", text: "Stir in the " },
      { type: "ingredient", text: "garlic powder", ingredientIndex: 2 },
      { type: "text", text: "." },
    ]);

    expect(linkStepIngredients("Add the garlic and cook.", ingredients)).toEqual([
      { type: "text", text: "Add the " },
      { type: "ingredient", text: "garlic", ingredientIndex: 1 },
      { type: "text", text: " and cook." },
    ]);
  });

  it("matches plural forms in steps", () => {
    expect(linkStepIngredients("Sweat the onions gently.", ingredients)).toEqual([
      { type: "text", text: "Sweat the " },
      { type: "ingredient", text: "onions", ingredientIndex: 3 },
      { type: "text", text: " gently." },
    ]);
  });

  it("does not match bare oil when the ingredient is olive oil", () => {
    expect(linkStepIngredients("Heat the oil in a pan.", ingredients)).toEqual([
      { type: "text", text: "Heat the oil in a pan." },
    ]);

    expect(linkStepIngredients("Warm the olive oil.", ingredients)).toEqual([
      { type: "text", text: "Warm the " },
      { type: "ingredient", text: "olive oil", ingredientIndex: 4 },
      { type: "text", text: "." },
    ]);
  });

  it("links multiple ingredients in one step", () => {
    expect(linkStepIngredients("Fry the onion in olive oil with cumin.", ingredients)).toEqual([
      { type: "text", text: "Fry the " },
      { type: "ingredient", text: "onion", ingredientIndex: 3 },
      { type: "text", text: " in " },
      { type: "ingredient", text: "olive oil", ingredientIndex: 4 },
      { type: "text", text: " with " },
      { type: "ingredient", text: "cumin", ingredientIndex: 0 },
      { type: "text", text: "." },
    ]);
  });
});
