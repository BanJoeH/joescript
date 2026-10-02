import { useEffect, useState } from "react";

import { ConfirmSheet } from "~/components/confirm-sheet";
import { DeleteForm } from "~/components/delete-form";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { RecipeForm } from "~/components/recipes/recipe-form";
import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.recipes.$recipeId.edit";

export { action, loader } from "./pantry.recipes.$recipeId.edit.server";

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
        actions={<DeleteForm confirmMessage={`Delete "${recipe.name}"?`} />}
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
          link: recipe.link ?? "",
          servings: recipe.servings ? String(recipe.servings) : "",
          ingredients: recipe.ingredients,
          steps: recipe.steps,
        }}
        error={actionData?.error}
        submitLabel="Save recipe"
      />

      <ConfirmSheet
        cancelLabel="Not now"
        confirmLabel="Update shopping list"
        description={shoppingCopyDescription(shoppingCopyCount ?? 0)}
        intent="sync-to-shopping"
        onOpenChange={setSyncSheetOpen}
        open={syncSheetOpen}
        title="Update shopping list?"
      />
    </div>
  );
}
