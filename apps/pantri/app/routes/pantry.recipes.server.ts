import { redirect } from "react-router";

import { getPantriEnv, getWorkerEnv } from "~/lib/context.server";
import { getString } from "~/lib/forms.server";
import { pantryPath } from "~/lib/pantry-path";
import { requirePantriService } from "~/services";
import { notifyPantryMutation } from "~/services/realtime.server";

import type { Route } from "./+types/pantry.recipes";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { pantri, pantryId } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const recipes = await pantri.recipes.list();

  return { recipes, pantryId };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { pantri, context } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const formData = await request.formData();
  const intent = getString(formData, "intent");
  const recipeId = getString(formData, "recipeId");

  if (intent === "add-to-shopping") {
    try {
      const shoppingRecipe = await pantri.shopping.addFromRecipe(recipeId);
      await notifyPantryMutation(context, getWorkerEnv());
      return { added: shoppingRecipe.name };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not add recipe to shopping list.",
      };
    }
  }

  if (intent === "delete") {
    try {
      await pantri.recipes.remove(recipeId);
      await notifyPantryMutation(context, getWorkerEnv());
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not delete recipe.",
      };
    }
    throw redirect(pantryPath(context.pantryId, "recipes"));
  }

  return { error: "Unknown action." };
}
