import { describe, expect, it } from "vitest";
import { renderRobotsTxt, renderSitemapXml, sitemapEntries } from "./seo.server";
import { absoluteUrl, defaultOgImage, site } from "./site";
import { publishedCaseStudies, publishedProjects } from "./work.server";

describe("seo", () => {
  it("lists the homepage, published case studies, and published projects", () => {
    const locs = sitemapEntries().map((entry) => entry.loc);

    expect(locs[0]).toBe(absoluteUrl("/"));
    for (const study of publishedCaseStudies()) {
      expect(locs).toContain(absoluteUrl(`/case-studies/${study.slug}`));
    }
    for (const project of publishedProjects()) {
      expect(locs).toContain(absoluteUrl(`/work/${project.slug}`));
    }
    expect(locs).not.toContain(absoluteUrl("/case-studies/stripe"));
  });

  it("renders a sitemap xml document", () => {
    const xml = renderSitemapXml();
    expect(xml).toContain('<?xml version="1.0" encoding="UTF-8"?>');
    expect(xml).toContain(`<loc>${site.url}/</loc>`);
    expect(xml).toContain(`<loc>${site.url}/work/pantri</loc>`);
    expect(xml).toContain(`<loc>${site.url}/case-studies/reporting</loc>`);
  });

  it("points robots.txt at the sitemap", () => {
    expect(renderRobotsTxt()).toContain(`Sitemap: ${absoluteUrl("/sitemap.xml")}`);
    expect(renderRobotsTxt()).toContain("Allow: /");
  });

  it("keeps the default Open Graph image at social preview size", () => {
    expect(defaultOgImage.path).toBe("/og.png");
    expect(defaultOgImage.width).toBe("1200");
    expect(defaultOgImage.height).toBe("630");
  });
});
