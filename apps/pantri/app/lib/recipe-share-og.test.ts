import { describe, expect, it } from "vitest";

import { buildShareOgHtml, escapeHtml, truncateOgTitle } from "./recipe-share-og";

describe("escapeHtml", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml(`a <b> & "c" 'd'`)).toBe("a &lt;b&gt; &amp; &quot;c&quot; &#39;d&#39;");
  });
});

describe("truncateOgTitle", () => {
  it("leaves short titles alone", () => {
    expect(truncateOgTitle("chili mac")).toBe("chili mac");
  });

  it("truncates long titles with an ellipsis", () => {
    const long = "a".repeat(60);
    expect(truncateOgTitle(long, 20)).toBe(`${"a".repeat(19)}…`);
  });
});

describe("buildShareOgHtml", () => {
  it("includes host, title, CTA, and escapes the recipe name", () => {
    const html = buildShareOgHtml({
      host: "pantri-dev.joescript.io",
      recipeName: 'chili <mac> & "beans"',
    });

    expect(html).toContain("pantri-dev.joescript.io");
    expect(html).toContain("chili &lt;mac&gt; &amp; &quot;beans&quot;");
    expect(html).toContain("See Recipe");
    expect(html).toContain("data:image/svg+xml");
    expect(html).not.toContain("<mac>");
  });
});
