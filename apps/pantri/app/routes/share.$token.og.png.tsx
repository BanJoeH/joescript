import { env } from "cloudflare:workers";
import { CustomFont, ImageResponse } from "cf-workers-og/html";

import poppinsExtraBoldUrl from "~/assets/fonts/Poppins-ExtraBold.ttf?inline";
import poppinsSemiBoldUrl from "~/assets/fonts/Poppins-SemiBold.ttf?inline";
import { buildShareOgHtml } from "~/lib/recipe-share-og";
import {
  getSharedRecipe,
  SHARE_OG_IMAGE_HEIGHT,
  SHARE_OG_IMAGE_WIDTH,
} from "~/lib/recipe-share";

import type { Route } from "./+types/share.$token.og.png";

const OG_CACHE_CONTROL = "public, max-age=3600";

let fontsPromise: Promise<CustomFont[]> | null = null;

async function loadOgFonts(): Promise<CustomFont[]> {
  fontsPromise ??= Promise.all([
    fetch(poppinsSemiBoldUrl).then((response) => {
      if (!response.ok) throw new Error("Failed to load Poppins SemiBold");
      return response.arrayBuffer();
    }),
    fetch(poppinsExtraBoldUrl).then((response) => {
      if (!response.ok) throw new Error("Failed to load Poppins ExtraBold");
      return response.arrayBuffer();
    }),
  ]).then(
    ([semiBold, extraBold]) => [
      new CustomFont("Poppins", semiBold, { weight: 600 }),
      new CustomFont("Poppins", extraBold, { weight: 800 }),
    ],
  );
  return fontsPromise;
}

export async function loader({ params }: Route.LoaderArgs) {
  const recipe = await getSharedRecipe(env.RECIPE_SHARES, params.token);
  if (!recipe) {
    throw new Response("Not found", { status: 404 });
  }

  const host = new URL(env.BETTER_AUTH_URL).host;
  const fonts = await loadOgFonts();
  const html = buildShareOgHtml({ host, recipeName: recipe.name });

  return ImageResponse.create(html, {
    width: SHARE_OG_IMAGE_WIDTH,
    height: SHARE_OG_IMAGE_HEIGHT,
    fonts,
    headers: {
      "Cache-Control": OG_CACHE_CONTROL,
    },
  });
}
