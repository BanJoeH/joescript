import { env } from "cloudflare:workers";

import { PantriBrand } from "~/components/pantri-brand";
import { type CookViewRecipe, RecipeCookView } from "~/components/recipes/recipe-cook-view";
import { CookFocusProvider } from "~/lib/cook-focus";
import {
  buildShareOgImageUrl,
  buildShareUrl,
  getSharedRecipe,
  SHARE_OG_IMAGE_HEIGHT,
  SHARE_OG_IMAGE_WIDTH,
  type SharedRecipePayload,
  sharedRecipeDescription,
} from "~/lib/recipe-share";

import type { Route } from "./+types/share.$token";

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

export async function loader({ params }: Route.LoaderArgs) {
  const recipe = await getSharedRecipe(env.RECIPE_SHARES, params.token);
  if (!recipe) {
    throw new Response("Recipe not found", { status: 404 });
  }

  const baseUrl = env.BETTER_AUTH_URL.replace(/\/+$/, "");
  return {
    recipe,
    token: params.token,
    url: buildShareUrl(baseUrl, params.token),
    imageUrl: buildShareOgImageUrl(baseUrl, params.token, recipe.updatedAt),
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

export default function SharedRecipePage({ loaderData }: Route.ComponentProps) {
  const { recipe, token } = loaderData;
  const cookRecipe = toCookRecipe(token, recipe);

  return (
    <CookFocusProvider>
      <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col gap-4 px-4 py-6 sm:px-6">
        <header className="flex flex-col gap-2">
          <PantriBrand iconClassName="size-8" titleClassName="text-lg" />
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">{recipe.name}</h1>
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
          <p className="text-sm text-muted-foreground">
            Source:{" "}
            <a className="underline underline-offset-2" href={recipe.link} rel="noreferrer">
              {recipe.link}
            </a>
          </p>
        ) : null}
      </main>
    </CookFocusProvider>
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
