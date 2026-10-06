import { describe, expect, it, vi } from "vitest";

import {
  assertSafeHttpUrl,
  fetchRecipePageHtml,
  htmlToPlainText,
  jsonLdRecipeLooksComplete,
  pickBestJsonLdRecipe,
  RecipeUrlError,
} from "./recipe-url";

describe("assertSafeHttpUrl", () => {
  it("accepts public http(s) hostnames and adds https", () => {
    expect(assertSafeHttpUrl("https://www.bbcgoodfood.com/recipes/x").href).toBe(
      "https://www.bbcgoodfood.com/recipes/x",
    );
    expect(assertSafeHttpUrl("example.com/recipe").href).toBe("https://example.com/recipe");
  });

  it("rejects localhost, private-looking hosts, IPs, and odd ports", () => {
    const blocked = [
      "http://localhost/recipe",
      "https://127.0.0.1/recipe",
      "https://192.168.1.9/cake",
      "https://[::1]/recipe",
      "https://metadata.google.internal/",
      "http://printer.local/recipe",
      "https://example.com:8080/recipe",
      "ftp://example.com/recipe",
      "https://user:pass@example.com/recipe",
    ];
    for (const url of blocked) {
      expect(() => assertSafeHttpUrl(url)).toThrow(RecipeUrlError);
    }
  });
});

describe("pickBestJsonLdRecipe", () => {
  it("reads a Recipe from @graph JSON-LD", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebSite", "name": "Food" },
            {
              "@type": "Recipe",
              "name": "Tomato pasta",
              "recipeYield": "4 servings",
              "recipeIngredient": ["200 g pasta", "1 tin tomatoes"],
              "recipeInstructions": [
                { "@type": "HowToStep", "text": "Boil the pasta." },
                { "@type": "HowToSection", "itemListElement": [
                  { "@type": "HowToStep", "text": "Simmer the sauce." }
                ]}
              ]
            }
          ]
        }
      </script>
    `;
    expect(pickBestJsonLdRecipe(html)).toEqual({
      name: "Tomato pasta",
      description: null,
      servings: 4,
      ingredients: ["200 g pasta", "1 tin tomatoes"],
      steps: ["Boil the pasta.", "Simmer the sauce."],
    });
  });

  it("reads description from JSON-LD", () => {
    const html = `
      <script type="application/ld+json">
        {
          "@type": "Recipe",
          "name": "Chili",
          "description": "<p>A hearty <strong>weeknight</strong> chili.</p>",
          "recipeIngredient": ["1 onion"],
          "recipeInstructions": ["Cook.", "Serve."]
        }
      </script>
    `;
    expect(pickBestJsonLdRecipe(html)?.description).toBe("A hearty weeknight chili.");
  });

  it("picks the Recipe with the most ingredients", () => {
    const html = `
      <script type="application/ld+json">
        [
          { "@type": "Recipe", "name": "Snack", "recipeIngredient": ["1 apple"] },
          { "@type": "Recipe", "name": "Stew", "recipeIngredient": ["1 onion", "2 carrots", "500 g beef"] }
        ]
      </script>
    `;
    expect(pickBestJsonLdRecipe(html)?.name).toBe("Stew");
  });

  it("returns null when there is no Recipe JSON-LD", () => {
    expect(pickBestJsonLdRecipe("<html><body>no recipe</body></html>")).toBeNull();
  });
});

describe("jsonLdRecipeLooksComplete", () => {
  it("requires ingredients or multiple steps", () => {
    expect(
      jsonLdRecipeLooksComplete({
        name: "X",
        description: null,
        servings: null,
        ingredients: ["flour"],
        steps: [],
      }),
    ).toBe(true);
    expect(
      jsonLdRecipeLooksComplete({
        name: "X",
        description: null,
        servings: 2,
        ingredients: [],
        steps: ["a", "b"],
      }),
    ).toBe(true);
    expect(
      jsonLdRecipeLooksComplete({
        name: "X",
        description: null,
        servings: 2,
        ingredients: [],
        steps: ["a"],
      }),
    ).toBe(false);
  });
});

describe("htmlToPlainText", () => {
  it("strips scripts and keeps readable text", () => {
    const text = htmlToPlainText(`
      <html><head><script>window.ad=true</script></head>
      <body><h1>Pancakes</h1><p>Mix flour.</p></body></html>
    `);
    expect(text).toContain("Pancakes");
    expect(text).toContain("Mix flour.");
    expect(text).not.toContain("window.ad");
  });
});

describe("fetchRecipePageHtml", () => {
  it("follows a safe redirect and returns html", async () => {
    const fetchImpl = vi.fn(async (input: string) => {
      if (input === "https://short.example/r") {
        return {
          ok: false,
          status: 302,
          headers: new Headers({ Location: "/recipe" }),
          arrayBuffer: async () => new ArrayBuffer(0),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: new Headers({ "Content-Type": "text/html" }),
        arrayBuffer: async () => new TextEncoder().encode("<html>ok</html>").buffer,
      };
    });

    const result = await fetchRecipePageHtml("https://short.example/r", fetchImpl);
    expect(result.url).toBe("https://short.example/recipe");
    expect(result.html).toContain("ok");
  });

  it("refuses a redirect to an IP literal", async () => {
    const fetchImpl = vi.fn(async () => ({
      ok: false,
      status: 302,
      headers: new Headers({ Location: "http://127.0.0.1/secret" }),
      arrayBuffer: async () => new ArrayBuffer(0),
    }));

    await expect(fetchRecipePageHtml("https://example.com/r", fetchImpl)).rejects.toBeInstanceOf(
      RecipeUrlError,
    );
  });
});
