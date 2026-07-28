import { redirect } from "react-router";

import { getPantriEnv, getWorkerEnv } from "~/lib/context.server";
import { getString } from "~/lib/forms.server";
import { pantryPath } from "~/lib/pantry-path";
import { requirePantriService } from "~/services";
import { extractRecipeFromPhotos } from "~/services/extract.server";
import { notifyPantryChange } from "~/services/realtime.server";

import type { Route } from "./+types/pantry.recipes.import-photos";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { pantri, pantryId } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const pendingPhotos = await pantri.photos.listPending();

  return { pendingPhotos, pantryId };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { pantri, context } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "upload") {
    const files = formData.getAll("photos").filter((value): value is File => value instanceof File);

    try {
      await pantri.photos.upload(files);
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not upload photos." };
    }
    return { ok: true as const };
  }

  if (intent === "remove-photo") {
    try {
      await pantri.photos.remove(getString(formData, "photoId"));
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not remove photo." };
    }
    return { ok: true as const };
  }

  if (intent === "extract") {
    const pending = await pantri.photos.listPending();
    if (pending.length === 0) {
      return { error: "Upload at least one photo first." };
    }

    try {
      const env = getWorkerEnv();
      const photoBytes = [];
      for (const photo of pending) {
        const object = await pantri.photos.getObject(photo.id);
        if (!object) {
          console.info("[pantri:extract]", "action:missing-r2-object", { photoId: photo.id });
          continue;
        }
        const bytes = new Uint8Array(await new Response(object.body).arrayBuffer());
        console.info("[pantri:extract]", "action:loaded-photo", {
          photoId: photo.id,
          bytes: bytes.byteLength,
          contentType: object.contentType,
        });
        photoBytes.push({
          bytes,
          contentType: object.contentType,
        });
      }

      console.info("[pantri:extract]", "action:calling-extract", { photos: photoBytes.length });
      const extracted = await extractRecipeFromPhotos({
        photos: photoBytes,
        ai: env.AI,
      });
      console.info("[pantri:extract]", "action:extracted", {
        name: extracted.name,
        servings: extracted.servings,
        ingredientCount: extracted.ingredients.length,
        stepCount: extracted.steps.length,
      });
      const recipe = await pantri.recipes.create({
        name: extracted.name,
        servings: extracted.servings ?? undefined,
        ingredients: extracted.ingredients,
        steps: extracted.steps,
      });
      console.info("[pantri:extract]", "action:created-recipe", { recipeId: recipe.id });
      await pantri.photos.attachToRecipe(
        pending.map((photo) => photo.id),
        recipe.id,
      );
      console.info("[pantri:extract]", "action:attached-photos", {
        recipeId: recipe.id,
        photoCount: pending.length,
      });
      await notifyPantryChange({ db: context.db, env, pantryId: context.pantryId });
      console.info("[pantri:extract]", "action:redirecting", { recipeId: recipe.id });
      throw redirect(pantryPath(context.pantryId, `recipes/${recipe.id}/edit`));
    } catch (error) {
      if (error instanceof Response) throw error;
      return { error: error instanceof Error ? error.message : "Could not create recipe draft." };
    }
  }

  return { error: "Unknown action." };
}
