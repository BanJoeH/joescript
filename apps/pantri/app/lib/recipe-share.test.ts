import { describe, expect, it } from "vitest";

import {
  buildShareOgImageUrl,
  buildShareUrl,
  isShareToken,
  newShareToken,
  parseSafeShareLoginNext,
  parseSharedRecipePayload,
  sharedRecipeDescription,
  sharedRecipeToCreateInput,
  toSharedRecipePayload,
} from "./recipe-share";

describe("newShareToken", () => {
  it("returns a url-safe opaque token", () => {
    const token = newShareToken();
    expect(isShareToken(token)).toBe(true);
    expect(token).not.toMatch(/[+/=]/);
  });
});

describe("buildShareUrl", () => {
  it("joins origin and token without trailing slash duplication", () => {
    expect(buildShareUrl("https://pantri.joescript.io/", "abc123XYZ_-token")).toBe(
      "https://pantri.joescript.io/r/abc123XYZ_-token",
    );
  });
});

describe("parseSafeShareLoginNext", () => {
  it("accepts a share path with a valid token", () => {
    expect(parseSafeShareLoginNext("/r/abc123XYZ_-token12")).toBe("/r/abc123XYZ_-token12");
  });

  it("rejects open redirects and malformed paths", () => {
    expect(parseSafeShareLoginNext(null)).toBeNull();
    expect(parseSafeShareLoginNext("/")).toBeNull();
    expect(parseSafeShareLoginNext("/pantries")).toBeNull();
    expect(parseSafeShareLoginNext("https://evil.example/r/abc123XYZ_-token12")).toBeNull();
    expect(parseSafeShareLoginNext("/r/abc123XYZ_-token12/extra")).toBeNull();
    expect(parseSafeShareLoginNext("/r/abc123XYZ_-token12?x=1")).toBeNull();
    expect(parseSafeShareLoginNext("/r/short")).toBeNull();
    expect(parseSafeShareLoginNext("//evil.example")).toBeNull();
  });
});

describe("sharedRecipeToCreateInput", () => {
  it("maps share payload fields for create without a shareToken", () => {
    const payload = toSharedRecipePayload({
      name: "Chili mac",
      description: "Comfort food",
      link: "https://example.com/chili",
      servings: 4,
      ingredients: [{ name: "pasta", amount: 200, unit: "g" }],
      steps: [{ order: 0, text: "Boil" }],
      updatedAt: "2026-01-02T03:04:05.000Z",
    });

    const input = sharedRecipeToCreateInput(payload);
    expect(input).toEqual({
      name: "Chili mac",
      description: "Comfort food",
      link: "https://example.com/chili",
      servings: 4,
      ingredients: [{ name: "pasta", amount: 200, unit: "g" }],
      steps: [{ order: 0, text: "Boil" }],
    });
    expect(input).not.toHaveProperty("shareToken");
  });

  it("omits null optional fields so create leaves them unset", () => {
    const payload = toSharedRecipePayload({
      name: "Plain",
      link: null,
      servings: null,
      ingredients: [],
      steps: [],
      updatedAt: "2026-01-02T03:04:05.000Z",
    });

    expect(sharedRecipeToCreateInput(payload)).toEqual({
      name: "Plain",
      description: undefined,
      link: undefined,
      servings: undefined,
      ingredients: [],
      steps: [],
    });
  });
});

describe("buildShareOgImageUrl", () => {
  it("version-stamps the og.png path for cache busting", () => {
    expect(
      buildShareOgImageUrl(
        "https://pantri.joescript.io/",
        "abc123XYZ_-token",
        "2026-01-02T03:04:05.000Z",
      ),
    ).toBe("https://pantri.joescript.io/r/abc123XYZ_-token/og.png?v=2026-01-02T03%3A04%3A05.000Z");
  });
});

describe("toSharedRecipePayload / parseSharedRecipePayload", () => {
  it("round-trips a public payload without internal ids", () => {
    const payload = toSharedRecipePayload({
      name: "Carbonara",
      description: "Silky Roman classic.",
      link: "https://example.com",
      servings: 2,
      ingredients: [{ name: "pasta", amount: 200, unit: "g" }],
      steps: [{ order: 0, text: "Boil water" }],
      updatedAt: new Date("2026-01-02T03:04:05.000Z"),
    });

    expect(payload).toEqual({
      v: 1,
      name: "Carbonara",
      description: "Silky Roman classic.",
      link: "https://example.com",
      servings: 2,
      ingredients: [{ name: "pasta", amount: 200, unit: "g" }],
      steps: [{ order: 0, text: "Boil water" }],
      updatedAt: "2026-01-02T03:04:05.000Z",
    });
    expect(parseSharedRecipePayload(payload)).toEqual(payload);
  });

  it("defaults missing description to null for older share payloads", () => {
    expect(
      parseSharedRecipePayload({
        v: 1,
        name: "Old share",
        link: null,
        servings: null,
        ingredients: [],
        steps: [],
        updatedAt: "2026-01-02T03:04:05.000Z",
      }),
    ).toMatchObject({ description: null });
  });

  it("rejects invalid payloads", () => {
    expect(parseSharedRecipePayload({ v: 2, name: "Nope" })).toBeNull();
    expect(parseSharedRecipePayload(null)).toBeNull();
  });
});

describe("sharedRecipeDescription", () => {
  it("summarizes ingredients and servings when no blurb is set", () => {
    const payload = toSharedRecipePayload({
      name: "Soup",
      link: null,
      servings: 4,
      ingredients: [
        { name: "onion", amount: 1, unit: null },
        { name: "stock", amount: 1, unit: "l" },
      ],
      steps: [],
      updatedAt: "2026-01-02T03:04:05.000Z",
    });

    expect(sharedRecipeDescription(payload)).toBe("2 ingredients · Serves 4 · Shared on Pantri");
  });

  it("prefers the recipe description when present", () => {
    const payload = toSharedRecipePayload({
      name: "Soup",
      description: "  A cozy weeknight bowl.  ",
      link: null,
      servings: 4,
      ingredients: [{ name: "onion", amount: 1, unit: null }],
      steps: [],
      updatedAt: "2026-01-02T03:04:05.000Z",
    });

    expect(sharedRecipeDescription(payload)).toBe("A cozy weeknight bowl.");
  });
});
