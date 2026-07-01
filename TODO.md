# Garden App TODO

## Guiding principles

* Keep the MVP simple.
* Don't over-engineer.
* Model the garden, not botany.
* Journal first, reminders second.
* Don't create packages until at least two apps genuinely need shared code.
* Keep all business logic behind a service layer.

---

# Phase 1 - Repository

* [x] Create `joescript` monorepo.
* [x] Install `pnpm`.
* [x] Configure workspaces.
* [x] Add Biome.
* [x] Add shared TypeScript config.
* [x] Configure GitHub Actions.
* [x] Configure Renovate/Dependabot (optional).
* [x] Vitest in garden app + test step in CI.

```
joescript/
├── apps/
│   ├── website/
│   └── garden/
├── package.json
├── pnpm-workspace.yaml
├── biome.json
└── tsconfig.json
```

No `packages/` initially.

---

# Phase 2 - Garden app

Stack

* [x] React Router v8
* [x] Cloudflare Workers
* [x] Turso
* [x] Drizzle
* [x] Better Auth
* [x] Google OAuth
* [x] shadcn/ui
* [x] Tailwind
* [x] Zod

Skip React Query initially.

Use:

* Loaders
* Actions
* Fetchers
* Revalidation

---

# Phase 3 - Infrastructure

* [x] Configure Drizzle.
* [x] Create first migration.
* [x] Configure Workers.
* [x] Configure local development.
* [x] Create Turso databases

  * [x] garden-dev
  * [x] garden-prod

* [x] R2 photo buckets (`garden-photos-dev` / `garden-photos-prod`) + `PHOTOS` binding

---

# Phase 4 - Authentication

Google login.

Google proves identity.

App decides access.

Tables

* [x] users
* [x] accounts
* [x] sessions
* [x] households
* [x] household_members
* [x] allowed_emails

No shared account.

Each person gets their own login.

---

# Phase 5 - Domain

Custom domains configured in `apps/garden/wrangler.jsonc`. Full setup: **`apps/garden/docs/domains.md`**.

| Environment | URL | Worker |
|-------------|-----|--------|
| Dev | `garden-dev.joescript.io` | `garden-dev` |
| Production | `garden.joescript.io` | `garden-prod` |

Keep apex `joescript.io` on SiteGround hosting; only Garden subdomains go to Workers.

## In repo

* [x] `wrangler.jsonc` custom domains + `BETTER_AUTH_URL` per environment
* [x] Setup guide (`apps/garden/docs/domains.md`)

## Manual (dashboard / DNS)

* [ ] Add `joescript.io` zone to Cloudflare
* [ ] Google OAuth: origins + redirect URIs for both Garden URLs
* [ ] Remove duplicate `BETTER_AUTH_URL` **secret** if set in Workers dashboard (use wrangler `vars`)
* [ ] Deploy dev + prod (CI or `pnpm deploy` / `pnpm deploy:prod`)

## DNS (pick one)

**Option A — recommended**

* [ ] Point `joescript.io` nameservers to Cloudflare
* [ ] Confirm apex / `www` still resolve to SiteGround website
* [ ] Deploy — Garden DNS records created automatically

**Option B — interim (SiteGround nameservers)**

* [ ] Add Cloudflare zone (step above)
* [ ] Deploy, then add SiteGround CNAMEs for `garden` and `garden-dev` per Cloudflare dashboard
* [ ] Plan migration to Option A

Later

* [ ] Move any remaining DNS fully to Cloudflare (if still on Option B)

---

# Phase 6 - Database

Migrations through `0007_hot_the_captain.sql` (photos). Run `pnpm db:migrate` on dev/prod after pulling schema changes.

## areas

* [x] id
* [x] household_id
* [x] name
* [x] sort_order
* [x] created_at
* [x] updated_at
* [x] deleted_at
* [x] created_by_user_id
* [x] updated_by_user_id

---

## plants

Represents a real plant in the garden.

No species table yet.

Fields

* [x] id
* [x] household_id
* [x] area_id
* [x] name
* [x] latin_name
* [x] cultivar
* [x] notes
* [x] planted_at
* [x] removed_at
* [x] created_at
* [x] updated_at
* [x] deleted_at
* [x] created_by_user_id
* [x] updated_by_user_id

Examples

* Patio lavender
* Front border lavender
* Rose by gate

---

## care_rules

Optional.

Plants may have zero rules.

Fields

* [x] id
* [x] plant_id
* [x] task_type
* [x] months_json
* [x] instructions
* [x] source
* [x] confidence
* [x] active
* [x] created_at
* [x] updated_at
* [x] deleted_at
* [x] created_by_user_id
* [x] updated_by_user_id

Examples

* Coppice
* Deadhead
* Feed
* Cut back

---

## journal_entries

The most important table.

Everything interesting goes here.

Fields

* [x] id
* [x] household_id
* [x] plant_id (nullable)
* [x] area_id (nullable)
* [x] care_rule_id (nullable)
* [x] task_type (nullable)
* [x] status (done | skipped | note)
* [x] notes
* [x] performed_at
* [x] created_at
* [x] updated_at
* [x] deleted_at
* [x] created_by_user_id
* [x] updated_by_user_id

Examples

* Fed lawn
* Coppiced dogwood
* First rose flower
* Added bark mulch
* Found aphids
* Removed buddleia

---

## photos

Linked to journal entries. Private R2 storage; served via authenticated route.

Fields

* [x] id
* [x] household_id
* [x] journal_entry_id
* [x] storage_key
* [x] content_type
* [x] byte_size
* [x] width / height
* [x] caption
* [x] role (general | before | after)
* [x] sort_order
* [x] created_at
* [x] updated_at
* [x] deleted_at
* [x] created_by_user_id
* [x] updated_by_user_id

---

# Phase 7 - Service layer ✅

Hide database behind services.

```
Routes

↓

GardenService

↓

Drizzle

↓

Turso
```

Examples

```
gardenService.plants.list()

gardenService.plants.create()

gardenService.journal.create()

gardenService.dashboard.getCurrentJobs()
```

This makes local-first easier later.

```
app/services/
  context.server.ts   # requireGardenService, household resolution
  garden.service.ts   # facade: createGardenService()
  areas.service.ts
  plants.service.ts
  care-rules.service.ts
  journal.service.ts
  photos.service.ts
  dashboard.service.ts
  types.ts
```

---

# Phase 8 - MVP Screens ✅

* [x] Login
* [x] Dashboard
* [x] Plants
* [x] Add plant (`/plants/new`)
* [x] Plant detail
* [x] Plant photos (`/plants/:plantId/photos`)
* [x] Edit plant
* [x] Areas
* [x] Add area (`/areas/new`)
* [x] Journal
* [x] Add journal entry
* [x] Edit journal entry
* [x] Add care rule
* [x] Edit care rule

---

# Phase 8.5 - UX polish ✅

* [x] Garden logo, favicon, apple touch icon
* [x] Mobile-friendly app header (brand + actions)
* [x] List pages: add flows behind header buttons (plants, areas, journal pattern)
* [x] Plant detail: care rules → photos → journal section order
* [x] Plant photo gallery with lightbox; 4-photo preview + “see more”
* [x] Latest photo per plant on plants list and areas page
* [x] Journal photo thumbnails on list, home, and plant journal rows
* [x] Same-day journal ordering (`performed_at` + `created_at`; real time when logging today)
* [x] `*.tsbuildinfo` gitignored and removed from tracking

---

# Phase 9 - Dashboard ✅

Calculate jobs.

Don't generate task rows.

Show

* [x] This month's jobs
* [x] Recent journal entries
* [x] Recently completed

Completing a reminder creates a journal entry linked to its care rule. Logged jobs disappear from the dashboard for that month.

---

# Phase 10 - Website

Modernise `joescript.io`

Simple landing page

* About
* Projects
* Garden
* GitHub
* Contact

---

# Phase 11 - Future

## Photos ✅

* [x] Journal photos (R2 + client resize, private authenticated delivery)
* [x] Before / after labels
* [x] Upload on journal create / edit; captions and role editing
* [x] Fullscreen lightbox with keyboard navigation
* [x] Plant photo gallery + dedicated all-photos page
* [x] Latest-photo previews on plants list and areas page
* [x] `photos.service.ts`: list for plant/entry, upload, cascade delete on journal remove

---

## Near-term

Good next steps that reuse existing data — journal-first, low infra cost.

* [ ] **On this day** — dashboard widget: journal entries from this calendar date in prior years
* [ ] **Journal see-more** on plant detail (mirror photos preview pattern)
* [ ] **Photo thumbnails** on dashboard recent-journal rows
* [ ] **Optional time** on journal entries (UI still date-only; sorting uses `created_at` as fallback)
* [ ] **Pagination / limits** on journal list and plant journal as data grows
* [ ] **Area previews** for journal entries logged to an area without a plant (if needed)

---

## Sharing

Public journal pages

```
Dogwood coppiced

Before
After
```

Generate Open Graph / Twitter cards.

---

## Garden timeline

* [ ] Timeline by year
* [ ] Timeline by plant
* [ ] Timeline by area

Natural follow-on once photos + journal density justify it.

---

## Today in previous years

See **Near-term** above for dashboard “on this day” slice. Broader views:

* [ ] Dedicated screen or expanded home section
* [ ] Filter by plant or area

Examples

```
28 June

2026
Fed lawn

2025
First rose

2024
Peacock butterfly
```

---

## Wildlife journal

* Birds
* Butterflies
* Hedgehogs
* Frogs

---

## Plant import

Use Perenual to seed data.

Store locally.

---

## Weather

* Frost warnings
* Rain-aware reminders

---

## AI

Built from your own journal.

Examples

* What should I do this weekend?
* When did I last feed the lawn?
* Which plants haven't been touched this year?

---

## Realtime

Not MVP.

Eventually

```
SSE

↓

Household updates

↓

React Router revalidation
```

---

# Things deliberately NOT in MVP

* Plant taxonomy tables
* Generated reminder rows
* Reminder snoozing
* Local-first sync
* Push notifications
* Calendar sync
* Shared packages
* React Query
* PWA / installable app (revisit if phone use dominates)

Add these only when the need becomes obvious.

---

# Vision

The app isn't a plant database.

It isn't a task manager.

It's a living journal of your garden that happens to generate reminders from the history you've built.
