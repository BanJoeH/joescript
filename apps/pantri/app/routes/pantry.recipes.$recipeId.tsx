import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { useFetcher } from "react-router";

import { DeleteForm } from "~/components/delete-form";
import { Link } from "~/components/link";
import { PageHeader } from "~/components/page-header";
import { RecipeCookView } from "~/components/recipes/recipe-cook-view";
import { ShareRecipeButton } from "~/components/recipes/share-recipe-button";
import { useFetcherSuccessToast, useToast } from "~/components/toast";
import { Button } from "~/components/ui/button";
import { useCookFocus } from "~/lib/cook-focus";
import { loadWithOfflineFallback } from "~/lib/offline/client-loader";
import { useOnlineStatus } from "~/lib/offline/connectivity";
import { submitOrQueue } from "~/lib/offline/outbox";
import { getRecipeDetail, saveRecipeDetail } from "~/lib/offline/snapshot";
import { pantryPath } from "~/lib/pantry-path";
import { cn } from "~/lib/utils";

import type { Route } from "./+types/pantry.recipes.$recipeId";

export { action, loader } from "./pantry.recipes.$recipeId.server";

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
  const online = useOnlineStatus();
  const cookFocus = useCookFocus();
  const focused = cookFocus?.focused ?? false;
  const shopFetcher = useFetcher<ShopActionData>({ key: `recipe-cook-shop:${recipe.id}` });
  const [queueing, setQueueing] = useState(false);
  const shopping = shopFetcher.state !== "idle" || queueing;

  useFetcherSuccessToast(shopFetcher, (data) => {
    if (data.added) {
      toast({ title: data.added, message: "Added to shopping" });
    }
  });

  async function handleShop(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    formData.set("recipeId", recipe.id);
    formData.set("shoppingRecipeId", crypto.randomUUID());
    setQueueing(true);
    try {
      const result = await submitOrQueue({
        pantryId,
        actionUrl: pantryPath(pantryId, `recipes/${recipe.id}`),
        formData,
        fetcherSubmit: (body, opts) => shopFetcher.submit(body, opts),
      });
      if (result === "queued") {
        toast({ title: recipe.name, message: "Queued to add when online" });
      }
    } finally {
      setQueueing(false);
    }
  }

  return (
    <div className={cn("flex flex-col", focused ? "h-full min-h-0 gap-0" : "gap-6")}>
      {!focused ? (
        <PageHeader
          actions={
            <>
              <form method="post" onSubmit={(event) => void handleShop(event)}>
                <input name="intent" type="hidden" value="add-to-shopping" />
                <Button disabled={shopping} size="sm" type="submit" variant="outline">
                  <ShoppingCart className="size-4" />
                  {shopping ? "Adding…" : "Shop"}
                </Button>
              </form>
              <ShareRecipeButton
                disabled={!online}
                isShared={Boolean(recipe.shareToken)}
                recipeId={recipe.id}
                recipeName={recipe.name}
                shareToken={recipe.shareToken}
                shareUpdatedAt={recipe.updatedAt}
              />
              <Button
                asChild={online}
                disabled={!online}
                size="sm"
                title={online ? undefined : "Requires a connection"}
                variant="outline"
              >
                {online ? (
                  <Link to={pantryPath(pantryId, `recipes/${recipe.id}/edit`)}>Edit</Link>
                ) : (
                  "Edit"
                )}
              </Button>
              <DeleteForm
                confirmMessage={`Delete "${recipe.name}"?`}
                confirmLabel="Delete recipe"
                disabled={!online}
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
