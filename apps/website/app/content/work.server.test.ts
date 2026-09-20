import { describe, expect, it } from "vitest";

import {
  caseStudies,
  caseStudyPublishGaps,
  featuredCaseStudy,
  isPublishedCaseStudy,
  isPublishedProject,
  projects,
  publishedCaseStudies,
  publishedProjects,
} from "./work.server";

describe("published projects", () => {
  it("publishes cards for Pantri, Garden, and Momentum", () => {
    expect(publishedProjects().map((project) => project.slug)).toEqual([
      "pantri",
      "garden",
      "momentum",
    ]);
  });

  it("rejects a published status that is still missing a screenshot", () => {
    const incomplete = {
      ...projects[0],
      status: "published" as const,
      problem: "A problem.",
      decision: "A decision.",
      purpose: "A purpose.",
      built: "What was built.",
      constraints: "A constraint.",
      tradeoffs: [
        { decision: "One", tradeoff: "Cost." },
        { decision: "Two", tradeoff: "Time." },
      ],
      architecture: "An overview.",
      result: "A result.",
      technologies: ["TypeScript"],
      media: null,
    };

    expect(isPublishedProject(incomplete)).toBe(false);
  });
});

describe("published case studies", () => {
  it("publishes the reporting rebuild and holds the others until metrics are confirmed", () => {
    expect(publishedCaseStudies().map((study) => study.slug)).toEqual(["reporting"]);
    expect(featuredCaseStudy()?.slug).toBe("reporting");

    for (const slug of ["stripe", "release-platform"]) {
      const study = caseStudies.find((item) => item.slug === slug);
      expect(study).toBeDefined();
      expect(isPublishedCaseStudy(study ?? caseStudies[0])).toBe(false);
      expect(caseStudyPublishGaps(study ?? caseStudies[0])).toEqual(
        expect.arrayContaining(["still a draft", "metrics not confirmed"]),
      );
    }
  });
});
