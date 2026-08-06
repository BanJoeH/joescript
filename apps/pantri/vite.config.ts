import { cloudflare } from "@cloudflare/vite-plugin";
import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { reactRouterDevTools } from "react-router-devtools";
import { defineConfig } from "vite";

export default defineConfig({
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
    noExternal: ["swiper"],
  },
});
