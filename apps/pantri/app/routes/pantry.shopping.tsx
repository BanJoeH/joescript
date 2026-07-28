import type { Route } from "./+types/pantry.shopping";

export { action } from "./pantry.shopping.server";

export function meta(_args: Route.MetaArgs) {
  return [{ title: "Shopping · Pantri" }];
}

/** UI is rendered by the home swiper layout; this route exists for URL + actions. */
export default function ShoppingRoute() {
  return null;
}
