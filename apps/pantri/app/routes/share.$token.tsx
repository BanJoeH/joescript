import { ArrowRight, BookPlus } from "lucide-react";
import { Form } from "react-router";

import { Link } from "~/components/link";
import { PantriBrand } from "~/components/pantri-brand";
import { type CookViewRecipe, RecipeCookView } from "~/components/recipes/recipe-cook-view";
import { Button } from "~/components/ui/button";
import { Label } from "~/components/ui/label";
import { Select } from "~/components/ui/select";
import { CookFocusProvider } from "~/lib/cook-focus";
import { pantryPath } from "~/lib/pantry-path";
import {
  SHARE_OG_IMAGE_HEIGHT,
  SHARE_OG_IMAGE_WIDTH,
  type SharedRecipePayload,
  sharedRecipeDescription,
} from "~/lib/recipe-share";

import type { Route } from "./+types/share.$token";

export { action, loader } from "./share.$token.server";

/** Short browser hint only — do not edge-cache HTML so unshare is immediate. */
const SHARE_CACHE_CONTROL = "private, no-cache";

function toCookRecipe(token: string, recipe: SharedRecipePayload): CookViewRecipe {
  return {
    id: `shared:${token}`,
    name: recipe.name,
    description: recipe.description,
    link: recipe.link,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
  };
}

export function headers() {
  return {
    "Cache-Control": SHARE_CACHE_CONTROL,
  };
}

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData?.recipe) {
    return [{ title: "Recipe · Pantri" }];
  }

  const { recipe, url, imageUrl } = loaderData;
  const title = `${recipe.name} · Pantri`;
  const description = sharedRecipeDescription(recipe);

  return [
    { title },
    { name: "description", content: description },
    { tagName: "link" as const, rel: "canonical", href: url },
    { property: "og:site_name", content: "Pantri" },
    { property: "og:locale", content: "en_GB" },
    { property: "og:title", content: recipe.name },
    { property: "og:description", content: description },
    { property: "og:type", content: "article" },
    { property: "og:url", content: url },
    { property: "og:image", content: imageUrl },
    { property: "og:image:alt", content: recipe.name },
    { property: "og:image:width", content: String(SHARE_OG_IMAGE_WIDTH) },
    { property: "og:image:height", content: String(SHARE_OG_IMAGE_HEIGHT) },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: recipe.name },
    { name: "twitter:description", content: description },
    { name: "twitter:image", content: imageUrl },
    { name: "twitter:image:alt", content: recipe.name },
  ];
}

export default function SharedRecipePage({ loaderData, actionData }: Route.ComponentProps) {
  const { recipe, token, signedIn, pantries, homePantryId, existing } = loaderData;
  const cookRecipe = toCookRecipe(token, recipe);
  const sharePath = `/r/${token}`;
  const defaultPantryId = homePantryId ?? pantries[0]?.id ?? "";

  return (
    <CookFocusProvider>
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col px-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] pt-5 sm:px-6">
        <header className="mb-6 flex flex-col gap-5">
          <PantriBrand iconClassName="size-7" titleClassName="text-base tracking-[0.16em]" />
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Shared recipe
            </p>
            <h1 className="text-2xl font-semibold leading-snug tracking-tight sm:text-[1.75rem]">
              {recipe.name}
            </h1>
            <p className="text-sm text-muted-foreground">{sharedRecipeMeta(recipe)}</p>
            {recipe.description ? (
              <p className="whitespace-pre-wrap pt-1 text-sm leading-relaxed text-muted-foreground">
                {recipe.description}
              </p>
            ) : null}
          </div>
        </header>

        <RecipeCookView readOnly recipe={cookRecipe} />

        {recipe.link ? (
          <p className="mt-6 text-sm text-muted-foreground">
            Source:{" "}
            <a className="underline underline-offset-2" href={recipe.link} rel="noreferrer">
              {recipe.link}
            </a>
          </p>
        ) : null}
      </main>

      <ShareImportDock
        defaultPantryId={defaultPantryId}
        error={actionData?.error}
        existing={existing}
        pantries={pantries}
        sharePath={sharePath}
        signedIn={signedIn}
      />
    </CookFocusProvider>
  );
}

function ShareImportDock({
  signedIn,
  pantries,
  defaultPantryId,
  existing,
  sharePath,
  error,
}: {
  signedIn: boolean;
  pantries: Array<{ id: string; name: string }>;
  defaultPantryId: string;
  existing: { pantryId: string; recipeId: string } | null;
  sharePath: string;
  error?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-xl flex-col gap-2 px-4 py-3 sm:px-6">
        {existing ? (
          <>
            <p className="text-xs text-muted-foreground">Already in your pantry</p>
            <Button asChild className="w-full justify-between" size="lg">
              <Link to={pantryPath(existing.pantryId, `recipes/${existing.recipeId}`)}>
                Open in Pantri
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        ) : null}

        {!existing && !signedIn ? (
          <>
            <p className="text-xs text-muted-foreground">
              Copy this recipe into your pantry to cook and shop from it.
            </p>
            <Button asChild className="w-full justify-between" size="lg">
              <Link to={`/login?next=${encodeURIComponent(sharePath)}`}>
                Sign in to add
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        ) : null}

        {!existing && signedIn && pantries.length === 0 ? (
          <>
            <p className="text-xs text-muted-foreground">
              Create a pantry first, then come back to add this recipe.
            </p>
            <Button asChild className="w-full justify-between" size="lg">
              <Link to="/pantries">
                Create a pantry
                <ArrowRight className="size-4" />
              </Link>
            </Button>
          </>
        ) : null}

        {!existing && signedIn && pantries.length > 0 ? (
          <Form className="flex flex-col gap-2" method="post">
            <input name="intent" type="hidden" value="import" />
            {pantries.length === 1 ? (
              <>
                <input name="pantryId" type="hidden" value={pantries[0].id} />
                <p className="text-xs text-muted-foreground">
                  Save a copy to <span className="text-foreground">{pantries[0].name}</span>
                </p>
              </>
            ) : (
              <div className="flex items-end gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  <Label className="text-xs text-muted-foreground" htmlFor="import-pantry">
                    Add to
                  </Label>
                  <Select
                    defaultValue={defaultPantryId}
                    id="import-pantry"
                    name="pantryId"
                    required
                  >
                    {pantries.map((pantry) => (
                      <option key={pantry.id} value={pantry.id}>
                        {pantry.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button className="shrink-0" size="lg" type="submit">
                  <BookPlus className="size-4" />
                  Add
                </Button>
              </div>
            )}
            {pantries.length === 1 ? (
              <Button className="w-full justify-between" size="lg" type="submit">
                Add to my pantry
                <BookPlus className="size-4" />
              </Button>
            ) : null}
            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </Form>
        ) : null}
      </div>
    </div>
  );
}

function sharedRecipeMeta(recipe: SharedRecipePayload) {
  const parts: string[] = [];
  if (recipe.servings) parts.push(`Serves ${recipe.servings}`);
  parts.push(
    `${recipe.ingredients.length} ingredient${recipe.ingredients.length === 1 ? "" : "s"}`,
  );
  return parts.join(" · ");
}
