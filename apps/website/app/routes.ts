import { index, type RouteConfig, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("work/:slug", "routes/work.$slug.tsx"),
  route("case-studies/:slug", "routes/case-studies.$slug.tsx"),
] satisfies RouteConfig;
