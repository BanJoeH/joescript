import { describe, expect, it, vi } from "vitest";

import { enqueueAddRecipeToShopping } from "~/lib/offline/add-recipe-to-shopping";

describe("enqueueAddRecipeToShopping", () => {
  it("enqueues add-from-recipe with client shopping id and ingredients", async () => {
    const enqueue = vi.fn(async (input: { fields: Record<string, string>; actionPath: string }) => {
      expect(input.actionPath).toBe("/p1/shopping");
      expect(input.fields.intent).toBe("add-from-recipe");
      expect(input.fields.recipeId).toBe("src1");
      expect(input.fields.name).toBe("Pasta");
      expect(input.fields.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      const ingredients = JSON.parse(input.fields.ingredients ?? "[]") as { id: string }[];
      expect(ingredients).toHaveLength(1);
      expect(ingredients[0]?.id).toBeTruthy();
      return {
        id: "obx_1",
        pantryId: "p1",
        createdAt: 1,
        actionPath: input.actionPath,
        fields: input.fields,
        status: "pending" as const,
      };
    });

    const result = await enqueueAddRecipeToShopping({
      pantryId: "p1",
      recipe: {
        id: "src1",
        name: "Pasta",
        link: null,
        servings: 2,
        ingredients: [{ name: "noodles", amount: 1, unit: "lb" }],
      },
      enqueue: enqueue as never,
    });

    expect(result.name).toBe("Pasta");
    expect(result.shoppingRecipeId).toBe(enqueue.mock.calls[0]?.[0].fields.id);
    expect(enqueue).toHaveBeenCalledOnce();
  });
});
