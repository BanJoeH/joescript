import { CaseStudyLayout } from "~/components/case-study-layout";
import { pageMeta } from "~/content/meta";

import type { Route } from "./+types/work.$slug";

export { loader } from "./work.$slug.server";

export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) {
    return [{ title: "Page not found · Joe Harrison" }];
  }

  return pageMeta({
    title: `${loaderData.project.name} · Joe Harrison`,
    description: loaderData.project.purpose,
    path: `/work/${loaderData.project.slug}`,
    imageAlt: loaderData.project.media.alt,
  });
}

export default function WorkPage({ loaderData }: Route.ComponentProps) {
  const { project } = loaderData;
  const links = [
    project.liveUrl
      ? { href: project.liveUrl, label: project.liveUrlLabel ?? `${project.name} live demo` }
      : null,
    project.githubUrl ? { href: project.githubUrl, label: `${project.name} on GitHub` } : null,
  ].flatMap((link) => (link ? [link] : []));

  return (
    <CaseStudyLayout
      kicker={`Project ${project.number}`}
      title={project.name}
      summary={project.purpose}
      media={project.media}
      sections={[
        { heading: "The user problem", body: project.problem },
        { heading: "What I built", body: project.built },
        { heading: project.constraintsHeading ?? "Constraints", body: project.constraints },
        {
          heading: "Decisions",
          items: project.tradeoffs.map((item) => ({
            title: item.decision,
            body: item.tradeoff,
          })),
        },
        { heading: "Architecture", body: project.architecture },
        { heading: "Result", body: project.result },
      ]}
      technologies={project.technologies}
      links={links}
      breadcrumb={{ href: "/", label: "Home" }}
    />
  );
}
