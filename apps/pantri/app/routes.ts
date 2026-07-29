import { index, layout, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("api/auth/*", "routes/api.auth.$.tsx"),
  layout("routes/app.tsx", [
    index("routes/app-index.tsx"),
    route("pantries", "routes/pantries.tsx"),
    route(":pantryId", "routes/pantry.tsx", [
      index("routes/pantry-index.tsx"),
      layout("routes/pantry.home.tsx", [
        route("shopping", "routes/pantry.shopping.tsx"),
        route("recipes", "routes/pantry.recipes.tsx"),
      ]),
      route("shopping/sorted", "routes/pantry.sorted.tsx"),
      route("sorted", "routes/pantry.sorted-redirect.tsx"),
      route("recipes/new", "routes/pantry.recipes.new.tsx"),
      route("recipes/import-photos", "routes/pantry.recipes.import-photos.tsx"),
      route("recipes/:recipeId", "routes/pantry.recipes.$recipeId.tsx"),
      route("recipes/:recipeId/edit", "routes/pantry.recipes.$recipeId.edit.tsx"),
      route("photos/:photoId", "routes/pantry.photos.$photoId.tsx"),
      route("settings", "routes/settings.tsx"),
      route("settings/personal", "routes/settings.personal.tsx"),
      route("settings/pantry", "routes/pantry.settings.tsx"),
      route("api/events", "routes/pantry.api.events.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
