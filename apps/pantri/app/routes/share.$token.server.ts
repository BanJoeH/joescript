import { env } from "cloudflare:workers";
import { redirect } from "react-router";

import { getPantriEnv, getWorkerEnv } from "~/lib/context.server";
import { getString } from "~/lib/forms.server";
import { pantryPath } from "~/lib/pantry-path";
import {
  buildShareOgImageUrl,
  buildShareUrl,
  getSharedRecipe,
  isShareToken,
  sharedRecipeToCreateInput,
} from "~/lib/recipe-share";
import { getOptionalPantriSession } from "~/lib/session.server";
import { requirePantriService } from "~/services";
import { getFavoritePantryId, listPantriesForUser } from "~/services/pantries.service";
import { notifyPantryMutation } from "~/services/realtime.server";
import { findRecipeByShareTokenForUser } from "~/services/recipe-share-lookup.server";

import type { Route } from "./+types/share.$token";

function homePantryIdFrom(
  pantries: Array<{ id: string }>,
  favoriteId: string | null,
): string | null {
  if (pantries.length === 0) return null;
  if (favoriteId && pantries.some((pantry) => pantry.id === favoriteId)) {
    return favoriteId;
  }
  if (pantries.length === 1) return pantries[0].id;
  return null;
}

export async function loader({ request, params }: Route.LoaderArgs) {
  if (!isShareToken(params.token)) {
    throw new Response("Recipe not found", { status: 404 });
  }

  const recipe = await getSharedRecipe(env.RECIPE_SHARES, params.token);
  if (!recipe) {
    throw new Response("Recipe not found", { status: 404 });
  }

  const baseUrl = env.BETTER_AUTH_URL.replace(/\/+$/, "");
  const sessionResult = await getOptionalPantriSession(request, getPantriEnv());

  if (!sessionResult) {
    return {
      recipe,
      token: params.token,
      url: buildShareUrl(baseUrl, params.token),
      imageUrl: buildShareOgImageUrl(baseUrl, params.token, recipe.updatedAt),
      signedIn: false as const,
      pantries: [] as Array<{ id: string; name: string }>,
      homePantryId: null as string | null,
      existing: null as { pantryId: string; recipeId: string } | null,
    };
  }

  const { session, db } = sessionResult;
  const pantries = await listPantriesForUser(db, session.user.id);
  const favoriteId = await getFavoritePantryId(db, session.user.id);
  const existing = await findRecipeByShareTokenForUser(db, session.user.id, params.token);

  return {
    recipe,
    token: params.token,
    url: buildShareUrl(baseUrl, params.token),
    imageUrl: buildShareOgImageUrl(baseUrl, params.token, recipe.updatedAt),
    signedIn: true as const,
    pantries,
    homePantryId: homePantryIdFrom(pantries, favoriteId),
    existing,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  if (!isShareToken(params.token)) {
    throw new Response("Recipe not found", { status: 404 });
  }

  const sharePath = `/r/${params.token}`;
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent !== "import") {
    return { error: "Unknown action." };
  }

  const sessionResult = await getOptionalPantriSession(request, getPantriEnv());
  if (!sessionResult) {
    throw redirect(`/login?next=${encodeURIComponent(sharePath)}`);
  }

  const recipe = await getSharedRecipe(env.RECIPE_SHARES, params.token);
  if (!recipe) {
    throw new Response("Recipe not found", { status: 404 });
  }

  const pantryId = getString(formData, "pantryId");
  const { pantri, context } = await requirePantriService(request, getPantriEnv(), pantryId);

  try {
    const created = await pantri.recipes.create(sharedRecipeToCreateInput(recipe));
    await notifyPantryMutation(context, getWorkerEnv());
    throw redirect(pantryPath(context.pantryId, `recipes/${created.id}`));
  } catch (error) {
    if (error instanceof Response) throw error;
    return {
      error: error instanceof Error ? error.message : "Could not import recipe.",
    };
  }
}
