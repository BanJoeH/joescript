export const site = {
  name: "Joe Harrison",
  url: "https://joescript.io",
  email: "joe@joescript.io",
  location: "Based in Hertfordshire · Remote-first across the UK",
  invitation: "Let's build something useful.",
  githubHref: "https://github.com/BanJoeH",
  linkedinHref: "https://www.linkedin.com/in/joescript/",
  cvHref: "/cv.pdf",
  privateRepositories:
    "Most of my recent commercial work is held in private repositories under an employer-managed GitHub account.",
} as const;

export const hero = {
  eyebrow: "Senior full-stack developer",
  heading: "I build web products that hold up in production.",
  body: "I work mainly with TypeScript, React and AWS, taking products from interface and API design through infrastructure, release and production support.",
} as const;

export const proofPoints = [
  { value: "5 years", label: "Commercial software development" },
  { value: "30s → <10s", label: "Report performance improvement" },
  {
    value: "Multi-currency",
    label: "Stripe flow, with no known missed or duplicate charges",
  },
] as const;

export function absoluteUrl(path: string) {
  return new URL(path, site.url).href;
}

type CreativeWorkInput = {
  name: string;
  purpose: string;
  slug: string;
};

export function homeJsonLd(projects: CreativeWorkInput[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Person",
        name: site.name,
        url: site.url,
        email: site.email,
        jobTitle: hero.eyebrow,
        address: {
          "@type": "PostalAddress",
          addressRegion: "Hertfordshire",
          addressCountry: "GB",
        },
      },
      ...projects.map((project) => ({
        "@type": "CreativeWork",
        name: project.name,
        description: project.purpose,
        url: absoluteUrl(`/work/${project.slug}`),
      })),
    ],
  };
}
