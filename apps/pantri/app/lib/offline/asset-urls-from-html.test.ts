import { describe, expect, it } from "vitest";

import { assetUrlsFromHtml } from "~/lib/offline/asset-urls-from-html";

describe("assetUrlsFromHtml", () => {
  it("collects stylesheet and modulepreload asset hrefs", () => {
    const html = `
      <link rel="stylesheet" href="/assets/root-abc.css" />
      <link rel="modulepreload" href="/assets/entry.client-xyz.js" />
      <script type="module" src="/assets/entry.client-xyz.js"></script>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins" />
    `;
    expect(assetUrlsFromHtml(html, "https://pantri.example").sort()).toEqual([
      "/assets/entry.client-xyz.js",
      "/assets/root-abc.css",
    ]);
  });

  it("keeps only same-origin /assets paths", () => {
    const html = `<link href="https://cdn.example/assets/evil.css" /><link href="/assets/ok.css" />`;
    expect(assetUrlsFromHtml(html, "https://pantri.example")).toEqual(["/assets/ok.css"]);
  });
});
