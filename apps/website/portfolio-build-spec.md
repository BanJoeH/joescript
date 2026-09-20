# Joe Harrison Portfolio Build Specification

## Goal

Build a restrained, fast portfolio that presents Joe as a senior product engineer with strong TypeScript and React skills and credible backend, AWS and production experience.

The site should feel like an engineer's evidence folder rather than a design experiment. It should explain ownership, decisions and results clearly. Avoid a wall of technology logos, animated skill meters or generic claims.

## Design direction

### Character

- Editorial rather than corporate
- Calm, direct and technically credible
- Generous spacing and large type
- Deep maroon as the main accent
- Warm neutral background rather than pure white
- Very little animation
- Strong contrast in both light and dark mode

### Colour tokens

Use CSS custom properties. These values reproduce the approved mock-up.

```css
:root {
  color-scheme: light dark;

  --background: light-dark(#f5f1eb, #171313);
  --surface: light-dark(#fffdfa, #211b1c);
  --text: light-dark(#211b1c, #f5efec);
  --muted-text: light-dark(#695f5c, #bfb3b0);
  --line: light-dark(#d9cec7, #44383a);
  --accent: light-dark(#6f1f37, #c8738d);
  --accent-soft: light-dark(#efe0e5, #3a222a);
}
```

Do not introduce extra accent colours unless a real state requires one. Maroon should be used for links, small labels, the highlighted project edge and important numeric proof. It should not cover large areas.

### Typography

- Display headings: Georgia initially. Replace with a high-quality serif only if the existing site already loads one.
- Body and controls: Inter, falling back to the system sans-serif stack.
- Use regular and medium weights only.
- Hero heading: responsive `clamp(2.8rem, 6vw, 5.4rem)` with tight line height.
- Section headings: approximately `2.35rem` on desktop.
- Body copy: 16–18px with a line height around 1.6.
- Avoid small text. Nothing essential should be below 14px.

### Layout

- Maximum content width: 1120px.
- Desktop page gutter: 24px minimum on each side.
- Mobile page gutter: 16px.
- Main section spacing: 72px desktop and 48px mobile.
- Use thin divider lines between major sections.
- Cards should have square or nearly square corners. Avoid the common rounded-card dashboard look.
- Do not add shadows unless needed to separate an overlay.

## Homepage structure

### Navigation

Left:

- Joe Harrison wordmark

Right:

- Work
- Case studies
- Contact
- Download CV, using the accent colour

On narrow screens, keep the name and Download CV. The remaining links may collapse into a simple menu or be hidden if every section remains easy to reach by scrolling.

### Hero

Left column:

```text
Senior full-stack developer

I build web products that hold up in production.

I work mainly with TypeScript, React and AWS, taking products from interface and API design through infrastructure, release and production support.
```

Right column proof points:

- 5 years — commercial software development
- 30s → <10s — report performance improvement
- $659k+ — processed through a payment flow I built

The proof points must stay secondary to the headline. Keep the wording factual and update the figures when newer verified totals are available.

### Selected work

Show three projects in one desktop row and one column on mobile:

1. Pantri
2. Garden
3. Momentum

Each card needs:

- Project number
- Project name
- One sentence describing the user problem
- One sentence describing the most interesting engineering decision or result
- Real screenshot or short product recording
- View project link
- GitHub link when the repository is public

Do not publish placeholder marketing copy. Until the final descriptions are written, mark incomplete cards as drafts or keep them off the live site.

### Featured commercial case study

Start with the reporting-system rebuild because it demonstrates technical judgement under a real constraint.

Working title:

> Rebuilding a reporting system without buying a new database

Opening context:

> A specialist analytics database was not approved, so the existing MySQL system had to be made faster and easier to maintain.

Show four outcomes:

- One definition — report columns moved from scattered database records into code
- Under 10 seconds — previously slow reports became consistently faster
- Per-client access — allow lists cover users, accounts and child accounts
- Queued jobs — long reports run with status tracking and retries

Link to a full case-study page. Do not include private source code, internal URLs, client names or screenshots containing company data.

### Footer

```text
Let's build something useful.
Based in Hertfordshire · Remote-first across the UK
joe@joescript.io
```

Also include GitHub, LinkedIn if used, and the current CV.

## Project page template

Every project page should use the same structure:

1. Clear project name and one-line purpose
2. Large product screenshot or short muted recording
3. The user problem
4. What Joe built
5. Important constraints
6. Two or three decisions and their trade-offs
7. Architecture overview where useful
8. Result or current status
9. Technology used, kept brief
10. Live demo and source links

For applications behind authentication, create one of these public entry points:

- Read-only demo with sample data
- Guided product tour
- Screenshot-led landing page
- Short recorded walkthrough

Never expose production credentials or weaken the real application's authentication merely to create a demo.

## Commercial case-study template

Commercial pages should focus on reasoning and results, not proprietary implementation details.

### Reporting rebuild

- Maintenance problem caused by database-held report definitions
- Decision to create one code-defined source of truth
- Permission model for clients, users and child accounts
- Use of `EXPLAIN ANALYZE`, covering indexes and earlier filtering
- EventBridge, SQS and Lambda path for long-running reports
- Observed performance change from 30+ seconds or timeouts to consistently under 10 seconds

### Stripe payment flow

- Business goal: allow smaller trial campaigns before an IO and 30-day invoice agreement
- Card collection, charging threshold and invoice integration
- Protection against duplicate charge attempts
- Webhook reconciliation and failure alerts
- More than $659k and £73k processed, plus EUR and AUD payments
- Wording must remain: no known missed or duplicate charges

### Development and release platform

- Previous shared development-server workflow
- Local authentication improvements
- Isolated branch previews through Cloudflare Pages
- GitHub Actions and automated test gates
- Change from releases every few weeks to as often as several per day

## Components

Build small reusable components rather than one oversized homepage component:

- `SiteHeader`
- `Hero`
- `ProofPointList`
- `SectionHeading`
- `ProjectCard`
- `ProjectGrid`
- `FeaturedCaseStudy`
- `OutcomeGrid`
- `SiteFooter`
- `CaseStudyLayout`
- `MediaFrame`

Follow the naming and file conventions already used in the repository. Do not introduce a component library solely for this redesign.

## Responsive behaviour

### Desktop

- Two-column hero
- Three-column project grid
- Two-column featured case study
- Full navigation

### Tablet

- Reduce hero gap before changing the column structure
- Project cards may become two columns if three become cramped
- Case-study outcome grid remains two columns where readable

### Mobile

- Single-column hero, projects and case study
- Proof points beneath the introduction
- At least 44px touch targets
- No horizontal scrolling
- Preserve generous spacing rather than shrinking type

## Interaction and motion

- Use visible focus states.
- Honour `prefers-reduced-motion`.
- Limit motion to small colour, underline or position transitions.
- Do not use scroll hijacking, parallax, a custom pointer, looping animation or text that types itself.
- Screenshots may use a small hover lift on pointer devices, but the page must communicate hierarchy without it.

## Accessibility

- Meet WCAG AA contrast.
- Use semantic landmarks and heading order.
- Provide useful alt text for product screenshots.
- Decorative visuals use empty alt text.
- Links must make sense outside their surrounding paragraph.
- Keyboard users must be able to reach every action.
- Do not use colour alone to express status or selection.
- Test at 200% browser zoom and at 320px width.

## Performance and metadata

- Aim for Lighthouse scores of 95+ for performance, accessibility, best practices and SEO.
- Optimise screenshots to AVIF or WebP with width and height set.
- Lazy-load below-the-fold media.
- Avoid large client-side dependencies for simple effects.
- Add a useful title and description to every page.
- Add Open Graph metadata and a simple social preview image.
- Include a favicon and canonical URL.
- Add structured data for `Person` and selected `CreativeWork` projects if it remains accurate.

## GitHub presentation

Add this sentence near the GitHub link or on the About page:

> Most of my recent commercial work is held in private repositories under an employer-managed GitHub account.

Each public project README should contain:

- What the product does
- Screenshot or recording
- Main technical decisions
- Local setup
- Architecture summary
- Testing instructions
- Known limitations
- Live demo link

## Build todo list

### Phase 1 — Inspect and protect the current site

- [ ] Read the existing repository structure, scripts, deployment setup and styling approach.
- [ ] Run the current tests, type checking, linting and production build.
- [ ] Record the current routes and public URLs.
- [ ] Preserve analytics, metadata, redirects and deployment configuration.
- [ ] Do not replace the framework or build setup without a clear need.
- [ ] Create a feature branch for the redesign.

### Phase 2 — Design foundation

- [ ] Add the colour tokens from this specification.
- [ ] Add the serif and sans-serif typography stacks.
- [ ] Create shared content-width and section-spacing rules.
- [ ] Implement light and dark mode using the current site preference system; otherwise follow the operating-system preference.
- [ ] Build the header and footer.
- [ ] Check contrast and keyboard focus before building the full page.

### Phase 3 — Homepage

- [ ] Build the two-column hero and proof-point list.
- [ ] Build the selected-work section with reusable project cards.
- [ ] Add the reporting-system featured case study.
- [ ] Add the footer contact section.
- [ ] Link the latest PDF CV.
- [ ] Add the private-commercial-GitHub explanation.
- [ ] Ensure every placeholder link is removed or disabled before release.

### Phase 4 — Project content

- [ ] Ask Joe for a one-sentence user problem for Pantri, Garden and Momentum.
- [ ] Ask Joe for two screenshots and one difficult engineering decision per project.
- [ ] Choose the strongest project as the first full case study.
- [ ] Build its public pre-auth landing page or read-only demo.
- [ ] Add its full project page to the portfolio.
- [ ] Update its GitHub README.
- [ ] Repeat for the other two projects after the first version is live.

### Phase 5 — Commercial case studies

- [ ] Build the reporting-system case study.
- [ ] Build the Stripe case study.
- [ ] Build the development and release-platform case study.
- [ ] Remove or generalise private company information.
- [ ] Verify every metric and reliability claim with Joe before publishing.

### Phase 6 — Quality

- [ ] Test at 320px, 375px, 768px, 1024px and a wide desktop size.
- [ ] Test keyboard navigation and visible focus.
- [ ] Test light mode, dark mode and reduced motion.
- [ ] Run unit tests for content helpers and interactive components where useful.
- [ ] Add one or two Playwright smoke tests for homepage navigation and project routes.
- [ ] Run type checking, linting and the production build.
- [ ] Run Lighthouse and fix material issues.
- [ ] Check for broken links, missing alt text and unfinished placeholders.

### Phase 7 — Release

- [ ] Create a preview deployment.
- [ ] Review the preview on phone and desktop with Joe.
- [ ] Make any content corrections.
- [ ] Deploy atomically using the existing production workflow.
- [ ] Verify the live CV, email, GitHub and project links.
- [ ] Add simple privacy-respecting analytics only if already used or explicitly wanted.

## Acceptance criteria for the first release

- The homepage matches the approved editorial and maroon design direction.
- It works from 320px mobile width through wide desktop screens.
- Pantri, Garden and Momentum are visible without requiring authentication to understand what they are.
- At least one project has a proper public case study or guided demo.
- At least one commercial case study is live.
- The current CV is downloadable.
- No private company data or credentials are exposed.
- There are no dead links, placeholder text or broken images.
- The production build, type checking and existing test suite pass.
- The site is keyboard usable and meets WCAG AA contrast.

## First prompt for Cursor

```text
Read this specification and inspect the existing portfolio repository before changing anything.

First report:
1. The current framework, routes, styling system and deployment setup.
2. Which existing parts can be reused.
3. Any conflict between the repository and the specification.
4. A short file-by-file implementation plan for Phase 1 through Phase 3.

Do not replace the framework, install a component library or rewrite unrelated code. Preserve the existing deployment setup and working routes. After the report, implement Phase 1 and Phase 2 only. Run the existing tests, type checking, linting and production build, and report any failures that existed before your changes separately from new failures.
```
