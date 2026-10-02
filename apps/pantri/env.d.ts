import type { PantryHub } from "./workers/pantry-hub";

declare module "*.ttf?inline" {
  const src: string;
  export default src;
}

declare global {
  interface Env {
    TURSO_DATABASE_URL: string;
    TURSO_AUTH_TOKEN?: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    PHOTOS: R2Bucket;
    RECIPE_SHARES: KVNamespace;
    AI: Ai;
    PANTRY_HUB: DurableObjectNamespace<PantryHub>;
  }
}
