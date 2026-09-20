import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { hero, homeJsonLd, site } from "./site";

const css = readFileSync(new URL("../app.css", import.meta.url), "utf8");

function channel(hex: string, offset: number) {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground: string, background: string) {
  const luminance = (hex: string) =>
    0.2126 * channel(hex, 1) + 0.7152 * channel(hex, 3) + 0.0722 * channel(hex, 5);
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

function token(name: string) {
  const match = css.match(
    new RegExp(`${name}:\\s*light-dark\\((#[0-9a-f]{6}),\\s*(#[0-9a-f]{6})\\)`),
  );
  if (!match) {
    throw new Error(`Missing token ${name}`);
  }
  return { light: match[1], dark: match[2] };
}

describe("site", () => {
  it("links the CV, personal GitHub, and LinkedIn", () => {
    expect(site.cvHref).toBe("/cv.pdf");
    expect(site.githubHref).toBe("https://github.com/BanJoeH");
    expect(site.linkedinHref).toBe("https://www.linkedin.com/in/joescript/");
  });

  it("omits CreativeWork entries when no project is published", () => {
    expect(homeJsonLd([])["@graph"].map((item) => item["@type"])).toEqual(["Person"]);
  });

  it("keeps the hero wording from the specification", () => {
    expect(hero.heading).toBe("I build web products that hold up in production.");
  });
});

describe("colour contrast", () => {
  it("meets WCAG AA for text, muted text, and accent on both schemes", () => {
    const text = token("--text");
    const muted = token("--muted-text");
    const accent = token("--accent");
    const background = token("--background");
    const surface = token("--surface");

    for (const scheme of ["light", "dark"] as const) {
      expect(contrast(text[scheme], background[scheme])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(muted[scheme], background[scheme])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(accent[scheme], background[scheme])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(accent[scheme], surface[scheme])).toBeGreaterThanOrEqual(4.5);
    }
  });
});
