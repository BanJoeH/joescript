import { absoluteUrl } from "~/content/site";

export function pageMeta(input: { title: string; description: string; path: string }) {
  const url = absoluteUrl(input.path);
  const image = absoluteUrl("/og.png");

  return [
    { title: input.title },
    { name: "description", content: input.description },
    { tagName: "link" as const, rel: "canonical", href: url },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:width", content: "1200" },
    { property: "og:image:height", content: "630" },
    { name: "twitter:card", content: "summary_large_image" },
  ];
}
