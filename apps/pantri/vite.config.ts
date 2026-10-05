import { execSync } from "node:child_process";

import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { reactRouterDevTools } from "react-router-devtools";
import { defineConfig } from "vite";

function resolveGitSha(): string {
  const fromCi = process.env.GITHUB_SHA?.trim();
  if (fromCi) return fromCi.slice(0, 7);

  try {
    return execSync("git rev-parse --short HEAD", { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

export default defineConfig({
  define: {
    "import.meta.env.PANTRI_GIT_SHA": JSON.stringify(resolveGitSha()),
  },
  plugins: [
    reactRouterDevTools(),
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    reactRouter(),
  ],
  resolve: {
    dedupe: ["react", "react-dom"],
    tsconfigPaths: true,
  },
  // Swiper has no React peerDependency, so Vite can resolve a second React copy
  // during SSR / late dep optimization (useState on null dispatcher).
  optimizeDeps: {
    include: ["swiper", "swiper/react"],
  },
  ssr: {
    noExternal: ["swiper", "cf-workers-og"],
    resolve: {
      conditions: ["workerd", "worker", "browser"],
    },
  },
});
