export type MediaAsset = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type Outcome = {
  value: string;
  label: string;
};

export type ArticleSection = {
  heading: string;
  body: string;
};

export type Tradeoff = {
  decision: string;
  tradeoff: string;
};

export type Project = {
  slug: string;
  name: string;
  number: string;
  status: "draft" | "published";
  problem: string | null;
  decision: string | null;
  media: MediaAsset | null;
  purpose: string | null;
  built: string | null;
  constraints: string | null;
  tradeoffs: Tradeoff[] | null;
  architecture: string | null;
  result: string | null;
  technologies: string[] | null;
  liveUrl: string | null;
  githubUrl: string | null;
};

export type PublishedProject = Omit<
  Project,
  | "status"
  | "problem"
  | "decision"
  | "media"
  | "purpose"
  | "built"
  | "constraints"
  | "tradeoffs"
  | "architecture"
  | "result"
  | "technologies"
> & {
  status: "published";
  problem: string;
  decision: string;
  media: MediaAsset;
  purpose: string;
  built: string;
  constraints: string;
  tradeoffs: Tradeoff[];
  architecture: string;
  result: string;
  technologies: string[];
};

export type CaseStudy = {
  slug: string;
  title: string;
  status: "draft" | "published";
  summary: string;
  context: string;
  outcomes: Outcome[];
  sections: ArticleSection[];
  technologies: string[];
  metricsVerified: boolean;
};

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function mediaComplete(media: MediaAsset | null): media is MediaAsset {
  return (
    media !== null &&
    hasText(media.src) &&
    hasText(media.alt) &&
    media.width > 0 &&
    media.height > 0
  );
}

function tradeoffsComplete(tradeoffs: Tradeoff[] | null): tradeoffs is Tradeoff[] {
  return (
    tradeoffs !== null &&
    tradeoffs.length >= 2 &&
    tradeoffs.every((item) => hasText(item.decision) && hasText(item.tradeoff))
  );
}

export function projectPublishGaps(project: Project) {
  const gaps: string[] = [];

  if (project.status !== "published") {
    gaps.push("still a draft");
  }
  if (!hasText(project.problem)) {
    gaps.push("missing user-problem sentence");
  }
  if (!hasText(project.decision)) {
    gaps.push("missing engineering decision");
  }
  if (!mediaComplete(project.media)) {
    gaps.push("missing screenshot");
  }
  if (!hasText(project.purpose)) {
    gaps.push("missing one-line purpose");
  }
  if (!hasText(project.built)) {
    gaps.push("missing what was built");
  }
  if (!hasText(project.constraints)) {
    gaps.push("missing constraints");
  }
  if (!tradeoffsComplete(project.tradeoffs)) {
    gaps.push("missing decisions and trade-offs");
  }
  if (!hasText(project.architecture)) {
    gaps.push("missing architecture");
  }
  if (!hasText(project.result)) {
    gaps.push("missing result");
  }
  if (
    !project.technologies ||
    project.technologies.length === 0 ||
    project.technologies.some((item) => !hasText(item))
  ) {
    gaps.push("missing technologies");
  }

  return gaps;
}

export function isPublishedProject(project: Project): project is PublishedProject {
  return projectPublishGaps(project).length === 0;
}

export function caseStudyPublishGaps(study: CaseStudy) {
  const gaps: string[] = [];

  if (study.status !== "published") {
    gaps.push("still a draft");
  }
  if (!study.metricsVerified) {
    gaps.push("metrics not confirmed");
  }
  if (!hasText(study.summary) || !hasText(study.context) || !hasText(study.title)) {
    gaps.push("missing summary");
  }
  if (study.outcomes.length === 0) {
    gaps.push("missing outcomes");
  }
  if (
    study.sections.length === 0 ||
    study.sections.some((section) => !hasText(section.heading) || !hasText(section.body))
  ) {
    gaps.push("missing sections");
  }

  return gaps;
}

export function isPublishedCaseStudy(study: CaseStudy) {
  return caseStudyPublishGaps(study).length === 0;
}

// Screenshots and project copy are from Joe.
export const projects: Project[] = [
  {
    slug: "pantri",
    name: "Pantri",
    number: "01",
    status: "published",
    liveUrl: "https://pantri.joescript.io",
    githubUrl: "https://github.com/BanJoeH/joescript/tree/main/apps/pantri",
    purpose: "A shared pantry for recipes, cooking, and the weekly shop.",
    problem:
      "Recipes lived in Google Keep as nested checklists, and an accidental drag could break the list.",
    decision:
      "A recipe is copied onto the shopping list, so the same dish can appear twice, each with its own bought state.",
    media: {
      src: "/pantri.png",
      alt: "Pantri cook view for Butter chicken, with the garlic paste quantity next to the step.",
      width: 2726,
      height: 1642,
    },
    built:
      "It started as ingredient lists and a shop. It is now a pantry my wife and I share: recipes, a list that updates on both phones, and a cook view that ties a step back to the ingredient quantity.",
    constraints:
      "The live pantry needs a sign-in. The screenshot is the cook view, with the ingredient quantity next to the step.",
    tradeoffs: [
      {
        decision: "Copy a recipe onto the list instead of linking it",
        tradeoff:
          "The same recipe can be shopped twice, each with its own bought ingredients. Editing the recipe afterwards does not change the copy already on the list.",
      },
      {
        decision: "Push list changes, not live cursors",
        tradeoff:
          "Server-sent events keep both phones in step while we tick items off. Showing each other's cursor would need operational transform, which the shop does not need.",
      },
    ],
    architecture:
      "TypeScript and React on Cloudflare Workers. Turso stores the pantry. One Durable Object per pantry holds the open connections and pushes a change to both phones. A recipe photo can be read into ingredients with Workers AI.",
    result:
      "Importing a recipe is no longer a fragile checklist, and cooking from the steps can jump to the quantity. We use the same list in the shop and when deciding what is already in the fridge.",
    technologies: ["TypeScript", "React", "Cloudflare Workers"],
  },
  {
    slug: "garden",
    name: "Garden",
    number: "02",
    status: "published",
    liveUrl: "https://garden.joescript.io",
    githubUrl: "https://github.com/BanJoeH/joescript/tree/main/apps/garden",
    purpose: "A shared journal for one household's garden.",
    problem:
      "We are novice gardeners, and without a record it was hard to know what the garden needed each month.",
    decision:
      "A journal entry is the record. Plants and areas hang off that, and care rules surface as jobs for the month.",
    media: {
      src: "/garden.png",
      alt: "Garden plant page for a Plantain lily hosta in the Woodland Border, with one care rule and no journal entries yet.",
      width: 2586,
      height: 1650,
    },
    built:
      "A household app my wife and I share for plants, areas, care rules, photos, and a home page of jobs due this month.",
    constraints:
      "The live journal needs a sign-in. The screenshot is a plant page, with its care rule and journal.",
    tradeoffs: [
      {
        decision: "Journal first, reminders second",
        tradeoff:
          "A calendar of jobs would be easier to schedule and would hide what actually happened in the garden.",
      },
      {
        decision: "Photos stay in the household",
        tradeoff: "A public gallery would be easier to share and wrong for a home garden.",
      },
    ],
    architecture:
      "React Router on Cloudflare Workers, with Turso for the journal and R2 for photos.",
    result:
      "We use it together. The home page lists the jobs for this month, so we know what needs doing without digging through notes.",
    technologies: ["TypeScript", "React", "Cloudflare Workers"],
  },
  {
    slug: "momentum",
    name: "Momentum",
    number: "03",
    status: "published",
    liveUrl: "https://momentum.joescript.io",
    githubUrl: "https://github.com/BanJoeH/joescript/tree/main/apps/momentum",
    purpose: "A workout journal that remembers how it felt, not only what you did.",
    problem:
      "Workouts lived in handwritten notepads, which were messy and hard to read across weeks.",
    decision: "Store the session, the work, and whether it was worth it. Do not store streaks.",
    media: {
      src: "/momentum.png",
      alt: "Momentum home screen, asking how the day feels, with the last workout scored as worth repeating.",
      width: 3012,
      height: 1692,
    },
    built:
      "A personal workout journal for sessions, exercises, how the day felt, and whether the last session was worth repeating.",
    constraints:
      "The live journal needs a sign-in. The screenshot is the home screen: how the day feels, and whether the last workout was worth repeating.",
    tradeoffs: [
      {
        decision: "No streaks",
        tradeoff:
          "A streak punishes a missed day. Making it easy to return after a miss mattered more than an unbroken count.",
      },
      {
        decision: "Ask whether it was worth it",
        tradeoff:
          "A performance chart answers a different question. Worth-it is the reminder that the hard start usually pays off.",
      },
    ],
    architecture:
      "React Router on Cloudflare Workers, with Turso for the journal and Google for sign-in.",
    result:
      "Before the next session, the last worth-it score is there. The workout almost always feels worth it once it is done, and that is the reason to start again.",
    technologies: ["TypeScript", "React", "Cloudflare Workers"],
  },
];

const reportingContext =
  "I wanted to move reporting to ClickHouse. The cost was not approved, so I rebuilt it on the MySQL database we already had.";

export const caseStudies: CaseStudy[] = [
  {
    slug: "reporting",
    title: "Rebuilding a reporting system without buying a new database",
    status: "published",
    metricsVerified: true,
    summary: reportingContext,
    context: reportingContext,
    outcomes: [
      {
        value: "One definition",
        label: "report columns moved from scattered database records into code",
      },
      {
        value: "Under 10 seconds",
        label: "the request tries to finish inline, and a miss is queued instead of a 500",
      },
      {
        value: "Per-client access",
        label: "allow lists cover users, accounts and child accounts",
      },
      {
        value: "Queued jobs",
        label: "a worker finishes them, and CloudWatch shows whether that path is holding",
      },
    ],
    sections: [
      {
        heading: "The reports that failed",
        body: "A report broken out by ad group, DMA and day could run to thousands of rows. The slow ones took 30 seconds or more. A timeout came back as a 500, so the person waiting got nothing.",
      },
      {
        heading: "Staying on MySQL",
        body: "ClickHouse would have kept several dimensions in one table and still answered in a reasonable time. The rebuild was mine: the definitions, the queries, the permissions and the queue. Staying on MySQL meant splitting the data more than I wanted, so a report cannot mix base dimensions such as country and publisher. That was the price of not buying the new database.",
      },
      {
        heading: "One source of truth",
        body: "Report columns had lived in scattered database records, so changing a report meant editing data. They moved into one code-defined source of truth. The new system had to match the old one. Permissions, definitions and the slow path were designed in from the start, not bolted on after it shipped.",
      },
      {
        heading: "Who can see a report",
        body: "Allow lists cover users, accounts, and child accounts, so each client only sees the rows they are permitted to see.",
      },
      {
        heading: "A ten-second race",
        body: "EXPLAIN ANALYZE showed where the slow reports spent their time. Covering indexes and earlier filtering removed work the database did not need to do. The request then races to finish in under 10 seconds. If it misses, the job goes to EventBridge, SQS and Lambda, with status tracking and retries. CloudWatch dashboards show whether the inline attempt is holding or the queue is taking the work. Reports that used to time out now finish on that worker instead of failing the request.",
      },
    ],
    technologies: ["TypeScript", "MySQL", "EventBridge", "SQS", "Lambda", "CloudWatch"],
  },
  {
    slug: "stripe",
    title: "Card payments before a 30-day invoice",
    status: "draft",
    metricsVerified: false,
    summary:
      "A Stripe payment flow lets new advertisers test the platform before moving onto an insertion order and 30-day invoicing.",
    context:
      "New advertisers needed a way to test the platform by card before an insertion order and 30-day invoicing.",
    outcomes: [
      {
        value: "Trial, then invoice",
        label: "card payments before an insertion order and 30-day invoicing",
      },
      {
        value: "Multiple currencies",
        label: "with charge tracking through the flow",
      },
      {
        value: "Reconciled",
        label: "webhooks, and no known missed or duplicate charges",
      },
    ],
    sections: [
      {
        heading: "Why card payments",
        body: "New advertisers can test the platform before moving onto an insertion order and 30-day invoicing.",
      },
      {
        heading: "Currencies and tracking",
        body: "The flow supports multiple currencies, with charge tracking.",
      },
      {
        heading: "Reconciliation",
        body: "Webhooks reconcile payments. There are no known missed or duplicate charges.",
      },
    ],
    technologies: ["TypeScript", "Stripe"],
  },
  {
    slug: "release-platform",
    title: "From a shared development server to several releases a day",
    status: "draft",
    metricsVerified: false,
    summary:
      "A shared development server gave way to local authentication, isolated branch previews, and automated test gates.",
    context:
      "Releases moved from every few weeks to as often as several a day after previews and test gates replaced a shared development server.",
    outcomes: [
      {
        value: "Several a day",
        label: "releases, up from every few weeks",
      },
      {
        value: "Isolated previews",
        label: "each branch has its own Cloudflare Pages preview",
      },
    ],
    sections: [
      {
        heading: "The shared server",
        body: "Development previously happened on a shared server, so one person's work could get in the way of another's.",
      },
      {
        heading: "Local authentication",
        body: "Local authentication improvements made it possible to work without that shared server.",
      },
      {
        heading: "Branch previews",
        body: "Isolated branch previews run through Cloudflare Pages.",
      },
      {
        heading: "Test gates",
        body: "GitHub Actions runs automated tests before a change can ship.",
      },
      {
        heading: "What changed",
        body: "Releases moved from every few weeks to as often as several a day.",
      },
    ],
    technologies: ["GitHub Actions", "Cloudflare Pages"],
  },
];

export function publishedProjects() {
  return projects.filter(isPublishedProject);
}

export function publishedCaseStudies() {
  return caseStudies.filter(isPublishedCaseStudy);
}

export function getPublishedProject(slug: string) {
  return publishedProjects().find((project) => project.slug === slug) ?? null;
}

export function getPublishedCaseStudy(slug: string) {
  return publishedCaseStudies().find((study) => study.slug === slug) ?? null;
}

export function featuredCaseStudy() {
  return getPublishedCaseStudy("reporting");
}
