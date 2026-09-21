import { renderSitemapXml } from "~/content/seo.server";

export function loader() {
  return new Response(renderSitemapXml(), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
