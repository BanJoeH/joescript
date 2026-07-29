# Pantri — remaining work checklist

App code for the platform roadmap lives under `apps/pantri`. This doc is the **ops + cutover backlog**: what still needs a human (or a follow-up PR), not what’s already implemented in the Worker.

**Target URLs**

| Env | URL | Worker name |
|-----|-----|-------------|
| Local | `http://localhost:5173` | — |
| Dev | `https://pantri-dev.joescript.io` | `pantri-dev` |
| Prod | `https://pantri.joescript.io` | `pantri-prod` |

Mirror garden’s domain notes in [`apps/garden/docs/domains.md`](../garden/docs/domains.md) (Cloudflare zone for `joescript.io`, free-plan SSL = one subdomain level).

---

## Status snapshot

| Area | Code | Ops / cutover |
|------|------|----------------|
| RR v8 + Workers + Turso schema | Done | Needs Turso DBs + migrate |
| Google auth + shared pantries | Done | Needs OAuth client + Worker secrets |
| Shopping / recipes / sorted / SSE | Done | Needs first deploy to verify |
| Photo import + Workers AI extract | Done | Needs R2 buckets + AI binding live |
| Firestore → Turso import script | Done | Needs real export JSON + run |
| CI deploy workflow | Done | Needs GH secrets + first push |
| Old Firebase app | Untouched (donor) | Archive after cutover |

---

## A. Local development (first time)

- [ ] From monorepo root: `pnpm install`
- [ ] Copy env templates:
  - [ ] `cp apps/pantri/.dev.vars.example apps/pantri/.dev.vars`
  - [ ] `cp apps/pantri/.env.migrate.dev.example apps/pantri/.env.migrate.dev` (optional until remote Turso exists)
  - [ ] `cp apps/pantri/.env.migrate.prod.example apps/pantri/.env.migrate.prod` (prod only)
- [ ] Fill `.dev.vars`:
  - [ ] `TURSO_DATABASE_URL` — for pure local SQLite you can use `file:local.db` (same as migrate:local)
  - [ ] `TURSO_AUTH_TOKEN` — omit for `file:` URLs
  - [ ] `BETTER_AUTH_SECRET` — ≥32 random chars (`openssl rand -base64 32`)
  - [ ] `BETTER_AUTH_URL=http://localhost:5173`
  - [ ] `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — OAuth client with localhost origins (see §C)
- [ ] `pnpm --filter @joescript/pantri db:migrate:local`
- [ ] `pnpm dev:pantri` — sign in, create a pantry, smoke-test shopping + recipes

---

## B. Cloudflare / Turso / R2 (manual infra)

### Turso

- [ ] Create DB `pantri-dev` (`turso db create pantri-dev`)
- [ ] Create DB `pantri-prod` (`turso db create pantri-prod`)
- [ ] Put URLs + tokens into:
  - [ ] `apps/pantri/.env.migrate.dev` / `.env.migrate.prod`
  - [ ] Worker secrets (see §D)
  - [ ] GitHub Actions environment secrets (see §E) — `pantri-dev` vs `pantri-production`
- [ ] Run migrations against remote:
  - [ ] `pnpm --filter @joescript/pantri db:migrate` (dev)
  - [ ] `pnpm --filter @joescript/pantri db:migrate:prod` (when ready)

### R2

Wrangler expects:

| Binding | Dev bucket | Prod bucket |
|---------|------------|-------------|
| `PHOTOS` | `pantri-photos-dev` | `pantri-photos-prod` |

- [ ] Create both buckets in Cloudflare R2
- [ ] Confirm `wrangler.jsonc` `r2_buckets` names match (already set; change only if you rename)

### Workers AI

- [ ] Ensure account has Workers AI enabled (binding `AI` is in `wrangler.jsonc`)
- [ ] After first deploy, upload a recipe photo on import and confirm extraction returns structured JSON (falls back to editable placeholder on failure)

### Durable Objects

- [ ] First deploy applies migration tag `v1` (`PantryHub`). No extra dashboard step if deploy succeeds
- [ ] Smoke-test: two browsers, same pantry, toggle purchased → other tab revalidates

---

## C. Google OAuth

Create a **Pantri** OAuth client (or add URIs to an existing joescript client).

**Authorized JavaScript origins**

```
http://localhost:5173
https://pantri-dev.joescript.io
https://pantri.joescript.io
```

**Authorized redirect URIs**

```
http://localhost:5173/api/auth/callback/google
https://pantri-dev.joescript.io/api/auth/callback/google
https://pantri.joescript.io/api/auth/callback/google
```

- [ ] Origins + redirects saved
- [ ] Client ID/secret copied into `.dev.vars` and Worker secrets

---

## D. Worker secrets (per environment)

`BETTER_AUTH_URL` is a **wrangler `var`**, not a secret (same pattern as garden).

Set secrets on `pantri-dev` and `pantri-prod` (dashboard or `wrangler secret put`):

| Secret | Notes |
|--------|--------|
| `BETTER_AUTH_SECRET` | Stable per env (or shared if you prefer) |
| `TURSO_DATABASE_URL` | Matching Turso DB |
| `TURSO_AUTH_TOKEN` | Matching token |
| `GOOGLE_CLIENT_ID` | |
| `GOOGLE_CLIENT_SECRET` | |

- [ ] Secrets set for **dev** Worker
- [ ] Secrets set for **prod** Worker
- [ ] No conflicting **secret** named `BETTER_AUTH_URL` (delete if present so wrangler `vars` win)

---

## E. Git / CI / first deploy

`apps/pantri` is new in the monorepo — it still needs to be committed and landed on `dev` / `main`.

- [ ] Review + commit `apps/pantri` (+ root `dev:pantri`, `deploy-pantri.yml`, lockfile) in joescript
- [ ] Push to `dev` → workflow [`.github/workflows/deploy-pantri.yml`](../../.github/workflows/deploy-pantri.yml) should deploy `pantri-dev`
- [ ] Confirm GitHub **Environments** `pantri-dev` / `pantri-production` have:
  - [ ] `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` (pantri DBs only — not garden’s)
  - [ ] `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID` (same account token is fine)
- [ ] Custom domains attach on deploy if `joescript.io` is an active Cloudflare zone (see garden domains doc)
- [ ] Open `https://pantri-dev.joescript.io` — Google login → create pantry → CRUD smoke test
- [ ] Merge / push `main` only after dev is healthy → `pantri.joescript.io`

---

## F. Data migration (Firebase → Turso)

Importer: `pnpm --filter @joescript/pantri import:firestore -- <export.json>`  
(See header comments in [`scripts/import-firestore.ts`](../scripts/import-firestore.ts).)

- [ ] Export Firestore `users/{uid}` (+ `recipes`, `shoppingList`, profile `oddBits` / `ingredientCategories`) to the JSON shape the script expects
- [ ] Dry-run import against **local** or **dev** Turso; verify one known account
- [ ] Import to **prod** Turso when cutting over (idempotent on `legacy_firebase_uid`)
- [ ] Announce: “Sign in with Google using your Pantri email”
- [x] Invite household partners from **Pantry settings** (Settings sheet → Pantry settings → Members). Pending invites claim on Google sign-in with that email; copy invite text from the pending list. No outbound email yet.

**Auth reminder:** passwords don’t migrate. Email/password users must use Google with the same email.

---

## G. Cutover & retire old app

- [ ] Point any old Pantri hosting / marketing links at `https://pantri.joescript.io`
- [ ] Keep Firebase read-only for a short rollback window
- [ ] Archive [`Personal/pantri`](../../../pantri) (or add README pointing here)
- [ ] Disable Firebase Auth / delete project when traffic is gone

---

## H. Optional polish (not blocking launch)

Product / eng follow-ups that are **out of the v1 roadmap** or nice-to-haves:

- [x] Favicon / brand assets (classic Pantri icons restored)
- [ ] Harden Workers AI extraction prompts / model choice after real cookbook photos
- [ ] Pantry roles (owner vs member)
- [ ] Offline write sync / PWA data caching
- [ ] Live cursors / OT (explicitly out of scope)
- [ ] Shared `packages/*` for recipe schema across joescript apps
- [ ] Email invite notifications (today: Settings sheet → Pantry settings → invite by email; user signs in with Google — no outbound mail)
- [ ] Automated E2E against `pantri-dev`

---

## Quick command cheat sheet

```bash
# Local
pnpm install
pnpm --filter @joescript/pantri db:migrate:local
pnpm dev:pantri

# Remote migrate
pnpm --filter @joescript/pantri db:migrate
pnpm --filter @joescript/pantri db:migrate:prod

# Import (after export JSON exists)
pnpm --filter @joescript/pantri import:firestore -- ./firestore-export.json

# Manual deploy (usually CI)
cd apps/pantri && pnpm deploy          # pantri-dev
cd apps/pantri && pnpm deploy:prod    # pantri-prod
```

---

## Suggested order

1. §A local + Google localhost  
2. §B Turso + R2  
3. §C OAuth production URIs  
4. §D Worker secrets  
5. §E commit + deploy `pantri-dev`  
6. §F import on dev, verify  
7. §E/F prod deploy + import + announce  
8. §G archive Firebase  
9. §H as needed  
