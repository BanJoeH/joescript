import { hero, proofPoints } from "~/content/site";
import { featuredCaseStudy, publishedProjects } from "~/content/work.server";

export function loader() {
  return {
    hero,
    proofPoints,
    projects: publishedProjects(),
    caseStudy: featuredCaseStudy(),
  };
}
