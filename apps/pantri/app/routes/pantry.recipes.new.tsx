import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { emptyRecipeFormDefaultValues, RecipeForm } from "~/components/recipes/recipe-form";
import { useOnlineStatus } from "~/lib/offline/connectivity";
import { pantryPath } from "~/lib/pantry-path";

import type { Route } from "./+types/pantry.recipes.new";

export { action } from "./pantry.recipes.new.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "New recipe · Pantri" }];
}

export default function NewRecipePage({ params, actionData }: Route.ComponentProps) {
  const online = useOnlineStatus();

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
        disabled={!online}
        error={actionData?.error}
        submitLabel="Create recipe"
      />
    </div>
  );
}
