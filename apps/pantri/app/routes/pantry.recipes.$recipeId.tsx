import { ShoppingCart } from "lucide-react";
import { useState } from "react";

import { DeleteForm } from "~/components/delete-form";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { RecipeCookView } from "~/components/recipes/recipe-cook-view";
import { ShareRecipeButton } from "~/components/recipes/share-recipe-button";
import { useToast } from "~/components/toast";
import { Button } from "~/components/ui/button";
import { useCookFocus } from "~/lib/cook-focus";
import { enqueueAddRecipeToShopping } from "~/lib/offline/add-recipe-to-shopping";
import { readRecipeFromSnapshot, upsertRecipeInSnapshot } from "~/lib/offline/recipes-snapshot";
import { pantryPath } from "~/lib/pantry-path";
import { cn } from "~/lib/utils";

import type { Route } from "./+types/pantry.recipes.$recipeId";

export { action, loader } from "./pantry.recipes.$recipeId.server";

export async function clientLoader({ serverLoader, params }: Route.ClientLoaderArgs) {
  const pantryId = params.pantryId;
  const recipeId = params.recipeId;
  try {
    const data = await serverLoader();
    try {
      await upsertRecipeInSnapshot(data.recipe);
    } catch {
      // Keep serving loader data even if IDB write fails.
    }
    return data;
  } catch (error) {
    const recipe = await readRecipeFromSnapshot(pantryId, recipeId);
    if (!recipe) throw error;
    return { recipe, pantryId };
  }
}
clientLoader.hydrate = true;

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    { title: loaderData?.recipe.name ? `${loaderData.recipe.name} · Pantri` : "Recipe · Pantri" },
  ];
}

export default function RecipeDetailPage({ loaderData }: Route.ComponentProps) {
  const { recipe, pantryId } = loaderData;
  const { toast } = useToast();
  const cookFocus = useCookFocus();
  const focused = cookFocus?.focused ?? false;
  const [shopping, setShopping] = useState(false);

  function addToShopping() {
    if (shopping) return;
    setShopping(true);
    void enqueueAddRecipeToShopping({ pantryId, recipe })
      .then(({ name }) => {
        toast({ title: name, message: "Added to shopping" });
      })
      .catch(() => {
        toast({ title: recipe.name, message: "Could not queue add to shopping." });
      })
      .finally(() => {
        setShopping(false);
      });
  }

  return (
    <div className={cn("flex flex-col", focused ? "h-full min-h-0 gap-0" : "gap-6")}>
      {!focused ? (
        <PageHeader
          actions={
            <>
              <Button
                disabled={shopping}
                onClick={addToShopping}
                size="sm"
                type="button"
                variant="outline"
              >
                <ShoppingCart className="size-4" />
                {shopping ? "Adding…" : "Shop"}
              </Button>
              <ShareRecipeButton
                isShared={Boolean(recipe.shareToken)}
                recipeId={recipe.id}
                recipeName={recipe.name}
                shareToken={recipe.shareToken}
                shareUpdatedAt={recipe.updatedAt}
              />
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
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>
                <Link className="hover:underline" to={pantryPath(pantryId, "recipes")}>
                  Recipes
                </Link>{" "}
                / Cook
              </span>
              {recipe.servings ? <span>Serves {recipe.servings}</span> : null}
              {recipe.link ? (
                <a
                  className="inline-flex items-center gap-1 hover:underline"
                  href={recipe.link}
                  rel="noreferrer"
                  target="_blank"
                >
                  Source
                </a>
              ) : null}
            </span>
          }
          title={recipe.name}
        />
      ) : null}

      <RecipeCookView className={focused ? "min-h-0 flex-1" : undefined} recipe={recipe} />
    </div>
  );
}
