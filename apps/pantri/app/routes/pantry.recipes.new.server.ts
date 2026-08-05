import { redirect } from "react-router";

import { getPantriEnv, getWorkerEnv } from "~/lib/context.server";
import { getOptionalString, getString } from "~/lib/forms.server";
import { pantryPath } from "~/lib/pantry-path";
import { parseRecipeIngredients, parseRecipeSteps } from "~/lib/recipe-schema";
import { requirePantriService } from "~/services";
import { notifyPantryMutation } from "~/services/realtime.server";

import type { Route } from "./+types/pantry.recipes.new";

export async function action({ request, params }: Route.ActionArgs) {
  const { pantri, context } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const formData = await request.formData();

  try {
    const servingsRaw = getOptionalString(formData, "servings");
    const recipe = await pantri.recipes.create({
      name: getString(formData, "name"),
      link: getOptionalString(formData, "link"),
      servings: servingsRaw ? Number(servingsRaw) : undefined,
      ingredients: parseRecipeIngredients(
        JSON.parse(getString(formData, "ingredientsJson") || "[]"),
      ),
      steps: parseRecipeSteps(JSON.parse(getString(formData, "stepsJson") || "[]")),
    });
    await notifyPantryMutation(context, getWorkerEnv());
    throw redirect(pantryPath(context.pantryId, `recipes/${recipe.id}`));
  } catch (error) {
    if (error instanceof Response) throw error;
    return { error: error instanceof Error ? error.message : "Could not create recipe." };
  }
}
