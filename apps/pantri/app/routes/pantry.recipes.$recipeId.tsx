import { useLoaderData } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { RecipeCookView } from "~/components/recipes/recipe-cook-view";
import { Button } from "~/components/ui/button";
import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.recipes.$recipeId";

export { action, loader } from "./pantry.recipes.$recipeId.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData?.recipe.name ? `${loaderData.recipe.name} · Pantri` : "Recipe · Pantri" },
  ];
}

export default function RecipeDetailPage() {
  const { recipe, pantryId } =
    useLoaderData<typeof import("./pantry.recipes.$recipeId.server").loader>();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        actions={
          <>
            <Button asChild size="sm" variant="outline">
              <Link to={pantryPath(pantryId, `recipes/${recipe.id}/edit`)}>Edit</Link>
            </Button>
            <DeleteForm
              confirmMessage={`Delete "${recipe.name}"?`}
              confirmLabel="Delete recipe"
              title="Delete recipe"
            />
          </>
        }
        description={
          <>
            <Link className="hover:underline" to={pantryPath(pantryId, "recipes")}>
              Recipes
            </Link>{" "}
            / Cook
          </>
        }
        title={recipe.name}
      />

      <RecipeCookView recipe={recipe} />
    </div>
  );
}
