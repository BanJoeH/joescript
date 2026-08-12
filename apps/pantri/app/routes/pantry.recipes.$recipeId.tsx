import { ShoppingCart } from "lucide-react";
import { useFetcher } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { RecipeCookView } from "~/components/recipes/recipe-cook-view";
import { useFetcherSuccessToast, useToast } from "~/components/toast";
import { Button } from "~/components/ui/button";
import { useCookFocus } from "~/lib/cook-focus";
import { pantryPath } from "~/lib/pantry-path";
import { cn } from "~/lib/utils";

import type { Route } from "./+types/pantry.recipes.$recipeId";

export { action, loader } from "./pantry.recipes.$recipeId.server";

type ShopActionData = {
  error?: string;
  added?: string;
};

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
  const shopFetcher = useFetcher<ShopActionData>({ key: `recipe-cook-shop:${recipe.id}` });
  const shopping = shopFetcher.state !== "idle";

  useFetcherSuccessToast(shopFetcher, (data) => {
    if (data.added) {
      toast({ title: data.added, message: "Added to shopping" });
    }
  });

  return (
    <div className={cn("flex flex-col", focused ? "h-full min-h-0 gap-0" : "gap-6")}>
      {!focused ? (
        <PageHeader
          actions={
            <>
              <shopFetcher.Form method="post">
                <input name="intent" type="hidden" value="add-to-shopping" />
                <Button disabled={shopping} size="sm" type="submit" variant="outline">
                  <ShoppingCart className="size-4" />
                  {shopping ? "Adding…" : "Shop"}
                </Button>
              </shopFetcher.Form>
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

      {shopFetcher.data?.error && !focused ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {shopFetcher.data.error}
        </p>
      ) : null}

      <RecipeCookView className={focused ? "min-h-0 flex-1" : undefined} recipe={recipe} />
    </div>
  );
}
