import { useEffect, useState } from "react";

import { ConfirmSheet } from "~/components/confirm-sheet";
import { DeleteForm } from "~/components/delete-form";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { RecipeForm } from "~/components/recipes/recipe-form";
import { loadWithOfflineFallback } from "~/lib/offline/client-loader";
import { useOnlineStatus } from "~/lib/offline/connectivity";
import { getRecipeDetail, saveRecipeDetail } from "~/lib/offline/snapshot";
import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.recipes.$recipeId.edit";

export { action, loader } from "./pantry.recipes.$recipeId.edit.server";

export async function clientLoader({ params, serverLoader }: Route.ClientLoaderArgs) {
  return loadWithOfflineFallback({
    serverLoader,
    readSnapshot: () => getRecipeDetail(params.pantryId, params.recipeId),
    writeSnapshot: async (data) => {
      await saveRecipeDetail(data.pantryId, data.recipe);
    },
  });
}

clientLoader.hydrate = true as const;

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit recipe · Pantri" }];
}

function shoppingCopyDescription(count: number) {
  return count === 1
    ? "Also update 1 shopping list copy of this recipe?"
    : `Also update ${count} shopping list copies of this recipe?`;
}

export default function EditRecipePage({ loaderData, actionData }: Route.ComponentProps) {
  const { recipe, pantryId } = loaderData;
  const online = useOnlineStatus();
  const shoppingCopyCount =
    actionData && "shoppingCopyCount" in actionData ? (actionData.shoppingCopyCount ?? 0) : 0;
  const [syncSheetOpen, setSyncSheetOpen] = useState(false);

  useEffect(() => {
    if (
      actionData &&
      "saved" in actionData &&
      actionData.saved &&
      "shoppingCopyCount" in actionData &&
      (actionData.shoppingCopyCount ?? 0) > 0
    ) {
      setSyncSheetOpen(true);
    }
  }, [actionData]);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <DeleteForm
            confirmMessage={`Delete "${recipe.name}"?`}
            disabled={!online}
            hiddenFields={{ recipeId: recipe.id }}
          />
        }
        description={
          <>
            <Link className="hover:underline" to={pantryPath(pantryId, "recipes")}>
              Recipes
            </Link>{" "}
            /{" "}
            <Link className="hover:underline" to={pantryPath(pantryId, `recipes/${recipe.id}`)}>
              {recipe.name}
            </Link>{" "}
            / Edit
          </>
        }
        title={recipe.name}
      />

      <RecipeForm
        defaultValues={{
          name: recipe.name,
          description: recipe.description ?? "",
          link: recipe.link ?? "",
          servings: recipe.servings ? String(recipe.servings) : "",
          ingredients: recipe.ingredients,
          steps: recipe.steps,
        }}
        disabled={!online}
        error={actionData?.error}
        submitLabel="Save recipe"
      />

      <ConfirmSheet
        cancelLabel="Not now"
        confirmLabel="Update shopping list"
        description={shoppingCopyDescription(shoppingCopyCount ?? 0)}
        intent="sync-to-shopping"
        onOpenChange={setSyncSheetOpen}
        open={online ? syncSheetOpen : false}
        title="Update shopping list?"
      />
    </div>
  );
}
