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

* [ ] React Router v7
* [ ] Cloudflare Workers
* [ ] Turso
* [ ] Drizzle
* [ ] Better Auth
* [ ] Google OAuth
* [ ] shadcn/ui
* [ ] Tailwind
* [ ] Zod

Skip React Query initially.

Use:

* Loaders
* Actions
* Fetchers
* Revalidation

---

# Phase 3 - Infrastructure

* [ ] Create Turso databases

  * [ ] garden-dev
  * [ ] garden-prod
* [ ] Configure Drizzle.
* [ ] Create first migration.
* [ ] Configure Workers.
* [ ] Configure local development.

---

# Phase 4 - Authentication

Google login.

Google proves identity.

App decides access.

Tables

* [ ] users
* [ ] accounts
* [ ] sessions
* [ ] households
* [ ] household_members
* [ ] allowed_emails

No shared account.

Each person gets their own login.

---

# Phase 5 - Domain

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

## areas

* id
* household_id
* name
* sort_order
* created_at
* updated_at
* deleted_at
* created_by_user_id
* updated_by_user_id

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

# Phase 7 - Service layer

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

---

# Phase 8 - MVP Screens

* [ ] Login
* [ ] Dashboard
* [ ] Plants
* [ ] Plant detail
* [ ] Areas
* [ ] Journal
* [ ] Add journal entry
* [ ] Add care rule

---

# Phase 9 - Dashboard

Calculate jobs.

Don't generate task rows.

Show

* This month's jobs
* Recent journal entries
* Recently completed

Completing a reminder creates a journal entry linked to its care rule.

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

## Photos

* Journal photos
* Before / after

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
* Photos
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
