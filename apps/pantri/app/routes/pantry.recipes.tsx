import type { Route } from "./+types/pantry.recipes";

export { action } from "./pantry.recipes.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Recipes · Pantri" }];
}

/** UI is rendered by the home swiper layout; this route exists for URL + actions. */
export default function RecipesRoute() {
  return null;
}
