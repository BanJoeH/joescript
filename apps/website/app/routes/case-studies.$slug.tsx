import { CaseStudyLayout } from "~/components/case-study-layout";
import { ReportingArchitectureDiagram } from "~/components/reporting-architecture-diagram";
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

const reportingDiagramCaption =
  "The API runs the MySQL query with a ten-second limit. Fast reports return inline; longer work creates a job, moves through SQS to a Lambda worker, and stores results. The client polls job status and fetches results when ready. CloudWatch takes metrics from the API, queue, and worker.";

export default function CaseStudyPage({ loaderData }: Route.ComponentProps) {
  const { study } = loaderData;

  const sections = study.sections.map((section) => {
    if (study.slug === "reporting" && section.heading === "A ten-second race") {
      return {
        ...section,
        diagram: <ReportingArchitectureDiagram />,
        diagramCaption: reportingDiagramCaption,
      };
    }
    return section;
  });

  return (
    <CaseStudyLayout
      kicker="Case study"
      title={study.title}
      summary={study.summary}
      outcomes={study.outcomes}
      sections={sections}
      technologies={study.technologies}
    />
  );
}
