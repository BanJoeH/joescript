declare global {
  interface Env {
    TURSO_DATABASE_URL: string;
    TURSO_AUTH_TOKEN?: string;
    BETTER_AUTH_SECRET: string;
    BETTER_AUTH_URL: string;
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
  }
}

export {};
