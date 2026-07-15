import { index, layout, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  route("login", "routes/login.tsx"),
  route("logout", "routes/logout.tsx"),
  route("api/auth/*", "routes/api.auth.$.tsx"),
  layout("routes/app.tsx", [
    index("routes/home.tsx"),
    route("workouts", "routes/workouts.tsx"),
    route("workouts/log", "routes/workouts.log.tsx"),
    route("workouts/:workoutId", "routes/workouts.$workoutId.tsx"),
    route("workouts/:workoutId/edit", "routes/workouts.$workoutId.edit.tsx"),
    route("progress", "routes/progress.tsx"),
    route("insights", "routes/insights.tsx"),
    route("settings", "routes/settings.tsx"),
    route("admin/allowed-emails", "routes/admin.allowed-emails.tsx"),
  ]),
] satisfies RouteConfig;
