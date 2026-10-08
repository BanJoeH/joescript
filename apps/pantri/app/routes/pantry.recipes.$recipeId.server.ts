import { redirect } from "react-router";

import { getPantriEnv, getWorkerEnv } from "~/lib/context.server";
import { getOptionalString, getString } from "~/lib/forms.server";
import { pantryPath } from "~/lib/pantry-path";
import { parseRecipeIngredients, parseRecipeSteps } from "~/lib/recipe-schema";
import { requirePantriService } from "~/services";
import { notifyPantryMutation } from "~/services/realtime.server";

import type { Route } from "./+types/pantry.recipes.$recipeId";

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

  if (intent === "add-to-shopping") {
    try {
      const shoppingRecipe = await pantri.shopping.addFromRecipe(params.recipeId);
      await notifyPantryMutation(context, getWorkerEnv());
      return { added: shoppingRecipe.name };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not add recipe to shopping list.",
      };
    }
  }

  if (intent === "ensure-share") {
    try {
      const { url, ogImageUrl } = await pantri.recipes.ensureShare(params.recipeId);
      await notifyPantryMutation(context, getWorkerEnv());
      return { url, ogImageUrl };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not create share link.",
      };
    }
  }

  if (intent === "unshare") {
    try {
      await pantri.recipes.unshare(params.recipeId);
      await notifyPantryMutation(context, getWorkerEnv());
      return { unshared: true as const };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not stop sharing.",
      };
    }
  }

  if (intent === "delete") {
    try {
      await pantri.recipes.remove(params.recipeId);
      await notifyPantryMutation(context, getWorkerEnv());
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not delete recipe." };
    }
    throw redirect(pantryPath(context.pantryId, "recipes"));
  }

  if (intent === "update") {
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
      return { saved: true as const, shoppingCopyCount };
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not update recipe." };
    }
  }

  if (intent === "sync-to-shopping") {
    try {
      const synced = await pantri.shopping.syncFromRecipe(params.recipeId);
      await notifyPantryMutation(context, getWorkerEnv());
      return { synced };
    } catch (error) {
      return {
        error: error instanceof Error ? error.message : "Could not update shopping list copies.",
      };
    }
  }

  return { error: "Unknown action." };
}
