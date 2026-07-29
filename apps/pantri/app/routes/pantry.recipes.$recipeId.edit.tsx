import { useActionData, useLoaderData } from "react-router";

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

export default function EditRecipePage() {
  const { recipe, pantryId } =
    useLoaderData<typeof import("./pantry.recipes.$recipeId.edit.server").loader>();
  const actionData =
    useActionData<typeof import("./pantry.recipes.$recipeId.edit.server").action>();

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
    </div>
  );
}
