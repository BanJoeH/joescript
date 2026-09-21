import { absoluteUrl } from "~/content/site";
import { publishedCaseStudies, publishedProjects } from "~/content/work.server";

export type SitemapEntry = {
  loc: string;
  changefreq: "weekly" | "monthly";
  priority: string;
};

export function sitemapEntries(): SitemapEntry[] {
  return [
    { loc: absoluteUrl("/"), changefreq: "weekly", priority: "1.0" },
    ...publishedCaseStudies().map((study) => ({
      loc: absoluteUrl(`/case-studies/${study.slug}`),
      changefreq: "monthly" as const,
      priority: "0.9",
    })),
    ...publishedProjects().map((project) => ({
      loc: absoluteUrl(`/work/${project.slug}`),
      changefreq: "monthly" as const,
      priority: "0.8",
    })),
  ];
}

export function renderSitemapXml(entries = sitemapEntries()) {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${entry.loc}</loc>
    <changefreq>${entry.changefreq}</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

export function renderRobotsTxt() {
  return `User-agent: *
Allow: /

Sitemap: ${absoluteUrl("/sitemap.xml")}
`;
}
