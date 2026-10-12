import type { Config } from "@react-router/dev/config";

export default {
  // Server-side render by default, to enable SPA mode set this to `false`
  ssr: true,
  // Lazy discovery hits `/__manifest` on hydrate/prefetch; offline that throws into
  // the error boundary (flash then Oops). Pantri's route tree is small — ship it all.
  routeDiscovery: { mode: "initial" },
} satisfies Config;
