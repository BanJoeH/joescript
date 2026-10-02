import { redirect } from "react-router";

import { getPantriEnv, getWorkerEnv } from "~/lib/context.server";
import { getOptionalString, getString } from "~/lib/forms.server";
import { pantryPath } from "~/lib/pantry-path";
import { parseRecipeIngredients, parseRecipeSteps } from "~/lib/recipe-schema";
import { requirePantriService } from "~/services";
import { notifyPantryMutation } from "~/services/realtime.server";

import type { Route } from "./+types/pantry.recipes.$recipeId.edit";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { pantri, pantryId } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const recipe = await pantri.recipes.get(params.recipeId);

  if (!recipe) {
    throw new Response("Recipe not found", { status: 404 });
  }

  return { recipe, pantryId };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { pantri, context } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "delete") {
    try {
      await pantri.recipes.remove(params.recipeId);
      await notifyPantryMutation(context, getWorkerEnv());
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not delete recipe." };
    }
    throw redirect(pantryPath(context.pantryId, "recipes"));
  }

  if (intent === "sync-to-shopping") {
    try {
      await pantri.shopping.syncFromRecipe(params.recipeId);
      await notifyPantryMutation(context, getWorkerEnv());
      throw redirect(pantryPath(context.pantryId, `recipes/${params.recipeId}`));
    } catch (error) {
      if (error instanceof Response) throw error;
      return {
        error: error instanceof Error ? error.message : "Could not update shopping list copies.",
      };
    }
  }

  try {
    const servingsRaw = getOptionalString(formData, "servings");
    await pantri.recipes.update(params.recipeId, {
      name: getString(formData, "name"),
      description: getOptionalString(formData, "description"),
      link: getOptionalString(formData, "link"),
      servings: servingsRaw ? Number(servingsRaw) : undefined,
      ingredients: parseRecipeIngredients(
        JSON.parse(getString(formData, "ingredientsJson") || "[]"),
      ),
      steps: parseRecipeSteps(JSON.parse(getString(formData, "stepsJson") || "[]")),
    });
    const shoppingCopyCount = await pantri.shopping.countBySourceRecipe(params.recipeId);
    await notifyPantryMutation(context, getWorkerEnv());

    if (shoppingCopyCount === 0) {
      throw redirect(pantryPath(context.pantryId, `recipes/${params.recipeId}`));
    }

    return { saved: true as const, shoppingCopyCount };
  } catch (error) {
    if (error instanceof Response) throw error;
    return { error: error instanceof Error ? error.message : "Could not update recipe." };
  }
}
