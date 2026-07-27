import { getPantriEnv, getWorkerEnv } from "~/lib/context.server";
import { getString } from "~/lib/forms.server";
import { groupBySection, type ShoppingSection } from "~/lib/ingredient-sections";
import { aggregateIngredients, type ShoppingLine } from "~/lib/shopping-aggregation";
import { requirePantriService } from "~/services";
import { notifyPantryChange } from "~/services/realtime.server";

import type { Route } from "./+types/pantry.sorted";

export async function loader({ request, params }: Route.LoaderArgs) {
  const { pantri, pantryId } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const [shoppingRecipes, oddBits, overrides] = await Promise.all([
    pantri.shopping.list(),
    pantri.oddBits.list(),
    pantri.categories.getOverrides(),
  ]);

  const lines: ShoppingLine[] = [
    ...shoppingRecipes.flatMap((recipe) =>
      recipe.ingredients.map((ingredient) => ({
        name: ingredient.name,
        amount: ingredient.amount,
        unit: ingredient.unit,
        purchased: ingredient.purchased,
        source: recipe.name,
      })),
    ),
    ...oddBits
      .filter((bit) => bit.name)
      .map((bit) => ({
        name: bit.name,
        amount: bit.amount,
        unit: bit.unit,
        purchased: bit.purchased,
        source: "Odd Bits",
      })),
  ];

  const aggregated = aggregateIngredients(lines);
  const sections = groupBySection(aggregated, (item) => item.name, overrides);

  return { sections, pantryId };
}

export async function action({ request, params }: Route.ActionArgs) {
  const { pantri, context } = await requirePantriService(request, getPantriEnv(), params.pantryId);
  const formData = await request.formData();
  const intent = getString(formData, "intent");

  if (intent === "set-category") {
    try {
      await pantri.categories.set({
        name: getString(formData, "name"),
        section: getString(formData, "section") as ShoppingSection,
      });
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not update category." };
    }
    return { ok: true as const };
  }

  if (intent === "toggle") {
    const name = getString(formData, "name");
    const purchased = getString(formData, "purchased") === "true";

    try {
      await Promise.all([
        pantri.shopping.setPurchasedByName(name, purchased),
        pantri.oddBits.setPurchasedByName(name, purchased),
      ]);
      await notifyPantryChange({ db: context.db, env: getWorkerEnv(), pantryId: context.pantryId });
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Could not update ingredient." };
    }
    return { ok: true as const };
  }

  return { error: "Unknown action." };
}
