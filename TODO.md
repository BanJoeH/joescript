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

* [x] React Router v7
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

Skipped for now — using `*.workers.dev` URLs. Revisit when ready to add `garden.joescript.io` / `dev.garden.joescript.io`.

Keep

```
joescript.io
```

Initially

* [ ] Leave DNS on SiteGround.
* [ ] Add

```
garden.joescript.io
dev.garden.joescript.io
```

Later

* [ ] Move DNS to Cloudflare.

---

# Phase 6 - Database

Schema and migration `0002_red_robin_chapel.sql` added. Run `pnpm db:migrate` on dev/prod.

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

* id
* household_id
* area_id
* name
* latin_name
* cultivar
* notes
* planted_at
* removed_at
* created_at
* updated_at
* deleted_at
* created_by_user_id
* updated_by_user_id

Examples

* Patio lavender
* Front border lavender
* Rose by gate

---

## care_rules

Optional.

Plants may have zero rules.

Fields

* id
* plant_id
* task_type
* months_json
* instructions
* source
* confidence
* active
* created_at
* updated_at
* deleted_at
* created_by_user_id
* updated_by_user_id

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

* id
* household_id
* plant_id (nullable)
* area_id (nullable)
* care_rule_id (nullable)
* task_type (nullable)
* status (done | skipped | note)
* notes
* performed_at
* created_at
* updated_at
* deleted_at
* created_by_user_id
* updated_by_user_id

Examples

* Fed lawn
* Coppiced dogwood
* First rose flower
* Added bark mulch
* Found aphids
* Removed buddleia

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
* [x] Plant detail
* [x] Areas
* [x] Journal
* [x] Add journal entry
* [x] Add care rule

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

Timeline by year.

Timeline by plant.

Timeline by area.

---

## Today in previous years

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

Add these only when the need becomes obvious.

---

# Vision

The app isn't a plant database.

It isn't a task manager.

It's a living journal of your garden that happens to generate reminders from the history you've built.
