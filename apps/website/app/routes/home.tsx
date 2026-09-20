import { FeaturedCaseStudy } from "~/components/featured-case-study";
import { Hero } from "~/components/hero";
import { ProjectGrid } from "~/components/project-grid";
import { SectionHeading } from "~/components/section-heading";
import { pageMeta } from "~/content/meta";
import { hero, homeJsonLd } from "~/content/site";

import type { Route } from "./+types/home";

export { loader } from "./home.server";

export function meta({ loaderData }: Route.MetaArgs) {
  return [
    ...pageMeta({
      title: "Joe Harrison · Senior full-stack developer",
      description: hero.body,
      path: "/",
    }),
    { "script:ld+json": homeJsonLd(loaderData?.projects ?? []) },
  ];
}

export default function Home({ loaderData }: Route.ComponentProps) {
  return (
    <main id="main" tabIndex={-1}>
      <section className="site-section">
        <div className="site-shell">
          <Hero
            eyebrow={loaderData.hero.eyebrow}
            heading={loaderData.hero.heading}
            body={loaderData.hero.body}
            points={loaderData.proofPoints}
          />
        </div>
      </section>
      {loaderData.caseStudy ? (
        <section id="case-studies" className="site-section border-t border-line">
          <div className="site-shell">
            <FeaturedCaseStudy study={loaderData.caseStudy} />
          </div>
        </section>
      ) : null}
      <section id="work" className="site-section border-t border-line">
        <div className="site-shell">
          <SectionHeading>Personal projects</SectionHeading>
          <ProjectGrid projects={loaderData.projects} />
        </div>
      </section>
    </main>
  );
}
