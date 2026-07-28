import { useActionData } from "react-router";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { emptyRecipeFormDefaultValues, RecipeForm } from "~/components/recipes/recipe-form";
import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.recipes.new";

export { action } from "./pantry.recipes.new.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "New recipe · Pantri" }];
}

export default function NewRecipePage({ params }: Route.ComponentProps) {
  const actionData = useActionData<typeof import("./pantry.recipes.new.server").action>();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        description={
          <>
            <Link className="hover:underline" to={pantryPath(params.pantryId, "recipes")}>
              Recipes
            </Link>{" "}
            / New recipe
          </>
        }
        title="New recipe"
      />

      <RecipeForm
        defaultValues={emptyRecipeFormDefaultValues}
        error={actionData?.error}
        submitLabel="Create recipe"
      />
    </div>
  );
}
