import { absoluteUrl, defaultOgImage, site } from "~/content/site";

export function pageMeta(input: {
  title: string;
  description: string;
  path: string;
  imagePath?: string;
  imageAlt?: string;
}) {
  const url = absoluteUrl(input.path);
  const image = absoluteUrl(input.imagePath ?? defaultOgImage.path);
  const imageAlt = input.imageAlt ?? defaultOgImage.alt;

  return [
    { title: input.title },
    { name: "description", content: input.description },
    { tagName: "link" as const, rel: "canonical", href: url },
    { property: "og:site_name", content: site.name },
    { property: "og:locale", content: "en_GB" },
    { property: "og:title", content: input.title },
    { property: "og:description", content: input.description },
    { property: "og:type", content: "website" },
    { property: "og:url", content: url },
    { property: "og:image", content: image },
    { property: "og:image:alt", content: imageAlt },
    { property: "og:image:width", content: defaultOgImage.width },
    { property: "og:image:height", content: defaultOgImage.height },
    { name: "twitter:card", content: "summary_large_image" },
    { name: "twitter:title", content: input.title },
    { name: "twitter:description", content: input.description },
    { name: "twitter:image", content: image },
    { name: "twitter:image:alt", content: imageAlt },
  ];
}
