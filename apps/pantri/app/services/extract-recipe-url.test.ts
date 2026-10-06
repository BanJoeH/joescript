import { describe, expect, it, vi } from "vitest";

import { type RecipePageFetch, RecipeUrlError } from "~/lib/recipe-url";
import { extractRecipeFromUrl } from "~/services/extract.server";

const BBC_STYLE_HTML = `
  <script type="application/ld+json">
    {
      "@type": "Recipe",
      "name": "Quick chickpea dhal",
      "description": "Try this quick and easy version of dhal.",
      "recipeYield": "4 servings",
      "recipeIngredient": [
        "3 garlic cloves finely chopped",
        "400g can of chickpeas drained and rinsed"
      ],
      "recipeInstructions": [
        { "@type": "HowToStep", "text": "Heat oil and cook aromatics." },
        { "@type": "HowToStep", "text": "Simmer with coconut milk." }
      ]
    }
  </script>
`;

describe("extractRecipeFromUrl", () => {
  it("imports from JSON-LD with description, parsed ingredients, and source URL", async () => {
    const fetchImpl = vi.fn<RecipePageFetch>(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "text/html" }),
      arrayBuffer: async () => new TextEncoder().encode(BBC_STYLE_HTML).buffer,
    }));

    const { recipe, sourceUrl } = await extractRecipeFromUrl({
      url: "https://www.bbcgoodfood.com/recipes/quick-easy-chickpea-coconut-dhal",
      fetch: fetchImpl,
    });

    expect(sourceUrl).toBe("https://www.bbcgoodfood.com/recipes/quick-easy-chickpea-coconut-dhal");
    expect(recipe.name).toBe("Quick chickpea dhal");
    expect(recipe.description).toBe("Try this quick and easy version of dhal.");
    expect(recipe.servings).toBe(4);
    expect(recipe.steps).toHaveLength(2);
    expect(recipe.ingredients).toEqual([
      { name: "garlic", amount: 3, unit: "clove", notes: "finely chopped" },
      {
        name: "chickpeas",
        amount: 1,
        unit: "can",
        notes: "400g; drained and rinsed",
      },
    ]);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("throws when the page has no usable recipe content", async () => {
    const fetchImpl = vi.fn<RecipePageFetch>(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "text/html" }),
      arrayBuffer: async () => new TextEncoder().encode("<html><body>Hello</body></html>").buffer,
    }));

    await expect(
      extractRecipeFromUrl({
        url: "https://example.com/empty",
        fetch: fetchImpl,
      }),
    ).rejects.toBeInstanceOf(RecipeUrlError);
  });
});
