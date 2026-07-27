import { useActionData } from "react-router";
import { Link } from "~/components/link";
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
      <div>
        <p className="text-sm text-muted-foreground">
          <Link className="hover:underline" to={pantryPath(params.pantryId, "recipes")}>
            Recipes
          </Link>{" "}
          / New recipe
        </p>
        <h2 className="text-2xl font-semibold tracking-tight">New recipe</h2>
      </div>

      <RecipeForm
        defaultValues={emptyRecipeFormDefaultValues}
        error={actionData?.error}
        submitLabel="Create recipe"
      />
    </div>
  );
}
