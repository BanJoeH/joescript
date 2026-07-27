import { useActionData, useLoaderData } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { Link } from "~/components/link";
import { RecipeForm } from "~/components/recipes/recipe-form";
import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.recipes.$recipeId.edit";

export { action, loader } from "./pantry.recipes.$recipeId.edit.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Edit recipe · Pantri" }];
}

export default function EditRecipePage() {
  const { recipe, pantryId } =
    useLoaderData<typeof import("./pantry.recipes.$recipeId.edit.server").loader>();
  const actionData =
    useActionData<typeof import("./pantry.recipes.$recipeId.edit.server").action>();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link className="hover:underline" to={pantryPath(pantryId, "recipes")}>
              Recipes
            </Link>{" "}
            / Edit
          </p>
          <h2 className="text-2xl font-semibold tracking-tight">{recipe.name}</h2>
        </div>
        <DeleteForm confirmMessage={`Delete "${recipe.name}"? This cannot be undone.`} />
      </div>

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
    </div>
  );
}
