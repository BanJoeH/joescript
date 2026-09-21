# Website

![Joe Harrison portfolio Open Graph preview.](docs/screenshot.png)

**Live:** [joescript.io](https://joescript.io) · Preview: [website-dev.joescript.io](https://website-dev.joescript.io)  
**Package:** `@joescript/website`

## Purpose

Editorial portfolio for Joe Harrison: home, personal project pages, and commercial case studies.

It should read like an engineer’s evidence folder — ownership, decisions, and results — not a template of logos and skill meters. Content is authored in code and published through explicit gates so drafts never appear on the live site.

## Architecture

React Router on Cloudflare Workers with Tailwind. There is no user database or auth. Site copy, projects, and case studies live in `app/content/`. The Worker serves SSR HTML, static assets from `public/`, and crawler routes for `sitemap.xml` and `robots.txt`. `www.joescript.io` redirects to the apex host.

| Concern | Where |
|---------|--------|
| Site identity, hero, JSON-LD | `app/content/site.ts` |
| Projects and case studies | `app/content/work.server.ts` |
| Canonical / Open Graph | `app/content/meta.ts` |
| Sitemap / robots | `app/content/seo.server.ts`, `app/routes/sitemap.ts`, `app/routes/robots.ts` |
| Worker + www redirect | `workers/app.ts` |

### Routes

| Path | Purpose |
|------|---------|
| `/` | Home |
| `/work/:slug` | Published project |
| `/case-studies/:slug` | Published case study |
| `/sitemap.xml` / `/robots.txt` | Crawlers |
| `/cv.pdf` | CV download (`public/cv.pdf`) |

### Publishing content

Edit `app/content/work.server.ts`. A project or case study only appears when `status: "published"` and every publish-gate field is filled (`projectPublishGaps` / `caseStudyPublishGaps`). Drafts (for example Stripe) return 404. Screenshots and the CV live under `public/`.

## Decisions

### Content in code with publish gates

A CMS would be easier to edit from a phone. Keeping projects and case studies in TypeScript means drafts stay off production until every required field is filled and marked published.

### One shared social preview image

Per-page screenshots as Open Graph images would track each project more closely. A single brand `og.png` keeps shares consistent; project pages still use their screenshot alt text for `og:image:alt`.

### Apex as the canonical host

Serving both `www` and apex without a redirect would split SEO signals. Canonical tags point at `https://joescript.io`, and the Worker issues a 301 from `www`.

## Setup

**Requires:** Node 24+, pnpm 11.7. No `.dev.vars` or database.

```bash
pnpm install
pnpm --filter @joescript/website dev
```

```bash
pnpm test            # unit (contrast, content, SEO)
pnpm test:e2e        # Playwright smoke (needs Chromium once via playwright install)
pnpm deploy          # website-dev
pnpm deploy:prod     # joescript.io + www
```

Site URL and contact details are hardcoded in `app/content/site.ts` (`https://joescript.io`). After production deploy, submit `https://joescript.io/sitemap.xml` in [Google Search Console](https://search.google.com/search-console).

Design brief: [`portfolio-build-spec.md`](portfolio-build-spec.md).

## Live link

- **Production:** https://joescript.io
- **Preview:** https://website-dev.joescript.io
- **CV:** https://joescript.io/cv.pdf
- **Source:** [`apps/website`](https://github.com/BanJoeH/joescript/tree/main/apps/website)
