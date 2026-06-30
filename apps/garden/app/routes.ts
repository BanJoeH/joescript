import { index, layout, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("api/auth/*", "routes/api.auth.$.tsx"),
  layout("routes/app.tsx", [
    index("routes/app-index.tsx"),
    route("households", "routes/households.tsx"),
    route("admin/allowed-emails", "routes/admin.allowed-emails.tsx"),
    route(":householdId", "routes/household.tsx", [
      index("routes/home.tsx"),
      route("settings", "routes/household.settings.tsx"),
      route("plants", "routes/plants.tsx"),
      route("plants/:plantId", "routes/plants.$plantId.tsx"),
      route("plants/:plantId/edit", "routes/plants.$plantId.edit.tsx"),
      route("plants/:plantId/care-rules/new", "routes/plants.$plantId.care-rules.new.tsx"),
      route(
        "plants/:plantId/care-rules/:careRuleId/edit",
        "routes/plants.$plantId.care-rules.$careRuleId.edit.tsx",
      ),
      route("areas", "routes/areas.tsx"),
      route("journal", "routes/journal.tsx"),
      route("journal/new", "routes/journal.new.tsx"),
      route("journal/:entryId/edit", "routes/journal.$entryId.edit.tsx"),
    ]),
  ]),
] satisfies RouteConfig;
