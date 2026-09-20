import { CaseStudyLayout } from "~/components/case-study-layout";
import { pageMeta } from "~/content/meta";

import type { Route } from "./+types/case-studies.$slug";

export { loader } from "./case-studies.$slug.server";

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "Page not found · Joe Harrison" }];
  }

  return pageMeta({
    title: `${loaderData.study.title} · Joe Harrison`,
    description: loaderData.study.summary,
    path: `/case-studies/${loaderData.study.slug}`,
  });
}

export default function CaseStudyPage({ loaderData }: Route.ComponentProps) {
  const { study } = loaderData;

  return (
    <CaseStudyLayout
      kicker="Case study"
      title={study.title}
      summary={study.summary}
      outcomes={study.outcomes}
      sections={study.sections}
      technologies={study.technologies}
    />
  );
}
