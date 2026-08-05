import { getPantriEnv, getWorkerEnv } from "~/lib/context.server";
import { getOptionalString, getString } from "~/lib/forms.server";
import { requirePantriService } from "~/services";
import { notifyPantryMutation } from "~/services/realtime.server";

import type { Route } from "./+types/pantry.shopping";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { pantri, pantryId } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const [recipes, oddBits] = await Promise.all([pantri.shopping.list(), pantri.oddBits.list()]);

  return { recipes, oddBits, pantryId };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { pantri, context } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  async function notify() {
    await notifyPantryMutation(context, getWorkerEnv());
  }

  try {
    if (intent === "toggle-ingredient") {
      await pantri.shopping.toggleIngredientPurchased(
        getString(formData, "shoppingRecipeId"),
        Number(getString(formData, "ingredientIndex")),
        getString(formData, "purchased") === "true",
      );
      await notify();
      return { ok: true as const };
    }

    if (intent === "remove-recipe") {
      await pantri.shopping.remove(getString(formData, "shoppingRecipeId"));
      await notify();
      return { ok: true as const };
    }

    if (intent === "add-odd-bit") {
      await pantri.oddBits.add({
        name: getString(formData, "name"),
        amount: (() => {
          const raw = getOptionalString(formData, "amount");
          return raw ? Number(raw) : null;
        })(),
        unit: getOptionalString(formData, "unit") ?? null,
        notes: getOptionalString(formData, "notes"),
      });
      await notify();
      return { ok: true as const };
    }

    if (intent === "toggle-odd-bit") {
      await pantri.oddBits.togglePurchased(
        Number(getString(formData, "index")),
        getString(formData, "purchased") === "true",
      );
      await notify();
      return { ok: true as const };
    }

    if (intent === "remove-odd-bit") {
      await pantri.oddBits.remove(Number(getString(formData, "index")));
      await notify();
      return { ok: true as const };
    }

    if (intent === "clear-recipe-purchased") {
      await pantri.shopping.clearPurchasedInRecipe(getString(formData, "shoppingRecipeId"));
      await notify();
      return { ok: true as const };
    }

    if (intent === "clear-odd-bits-purchased") {
      await pantri.oddBits.clearAllPurchased();
      await notify();
      return { ok: true as const };
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Something went wrong." };
  }

  return { error: "Unknown action." };
}
