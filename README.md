# joescript

Personal monorepo for Joe Harrison’s Cloudflare Worker apps.

| App | Package | Live | README |
|-----|---------|------|--------|
| [Pantri](apps/pantri) | `@joescript/pantri` | [pantri.joescript.io](https://pantri.joescript.io) | [README](apps/pantri/README.md) |
| [Garden](apps/garden) | `@joescript/garden` | [garden.joescript.io](https://garden.joescript.io) | [README](apps/garden/README.md) |
| [Momentum](apps/momentum) | `@joescript/momentum` | [momentum.joescript.io](https://momentum.joescript.io) | [README](apps/momentum/README.md) |
| [Website](apps/website) | `@joescript/website` | [joescript.io](https://joescript.io) | [README](apps/website/README.md) |

Each app README covers screenshot, purpose, architecture, decisions, setup, and live link.

## Requirements

- Node 24+ (see `.nvmrc`)
- [pnpm](https://pnpm.io) 11.7.0 (`packageManager` in root `package.json`)

```bash
pnpm install
pnpm dev:pantri      # or dev:garden / dev:momentum
pnpm --filter @joescript/website dev
pnpm check && pnpm typecheck
```

## Shared stack

Household apps (Pantri, Garden, Momentum) share the same shape:

- React Router 8 · React 19 · Vite 8 · Tailwind 4
- Cloudflare Workers with `nodejs_compat`
- Turso (libSQL) + Drizzle ORM
- Better Auth + Google OAuth

The portfolio site uses the same React Router / Workers / Tailwind base, without a database or auth.

Workspace packages are `apps/*` only (`pnpm-workspace.yaml`). Run app scripts with `pnpm --filter @joescript/<app> <script>` or `cd apps/<app>`.

## Secrets

- Local: `apps/<app>/.dev.vars` (gitignored) — never commit
- Deployed Workers: `wrangler secret put <NAME>` per environment, or GitHub environment secrets used by deploy workflows
- Drizzle migrate files: `apps/<app>/.env.migrate.{dev,prod,local}` (also local-only)

## CI and deploy

- **CI** (`.github/workflows/ci.yml` on `dev` / `main` and PRs): Biome, typecheck, vitest for garden / momentum / website, website Playwright, full build. Pantri unit tests are not in the CI matrix yet.
- **Deploy** (`deploy-<app>.yml`): pushes to `dev` deploy the `*-dev` Worker; pushes to `main` deploy production.

Dev hostnames use one subdomain level (`pantri-dev.joescript.io`, not `dev.pantri.*`) so Cloudflare free-plan SSL covers them.
