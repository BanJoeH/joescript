import { enqueueOutbox } from "~/lib/offline/outbox";
import { pantryPath } from "~/lib/pantry-path";
import {
  type RecipeIngredient,
  serializeShoppingIngredients,
  toShoppingIngredients,
} from "~/lib/recipe-schema";

export type AddRecipeToShoppingInput = {
  pantryId: string;
  recipe: {
    id: string;
    name: string;
    link: string | null;
    servings: number | null;
    ingredients: RecipeIngredient[];
  };
  enqueue?: typeof enqueueOutbox;
};

/**
 * Local-first: enqueue an add-from-recipe outbox row with a client shopping-recipe
 * id and ingredient ids so home/sorted can show it before drain.
 */
export async function enqueueAddRecipeToShopping(input: AddRecipeToShoppingInput) {
  const shoppingRecipeId = crypto.randomUUID();
  const ingredients = toShoppingIngredients(input.recipe.ingredients);
  const enqueue = input.enqueue ?? enqueueOutbox;

  await enqueue({
    pantryId: input.pantryId,
    actionPath: pantryPath(input.pantryId, "shopping"),
    fields: {
      intent: "add-from-recipe",
      id: shoppingRecipeId,
      recipeId: input.recipe.id,
      name: input.recipe.name,
      link: input.recipe.link ?? "",
      servings: input.recipe.servings != null ? String(input.recipe.servings) : "",
      ingredients: serializeShoppingIngredients(ingredients),
    },
  });

  return { shoppingRecipeId, name: input.recipe.name };
}
