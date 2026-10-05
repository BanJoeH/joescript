/** Short git SHA baked in at build time (see vite.config.ts). */
export const APP_VERSION =
  typeof import.meta.env.PANTRI_GIT_SHA === "string" && import.meta.env.PANTRI_GIT_SHA.length > 0
    ? import.meta.env.PANTRI_GIT_SHA
    : "unknown";
