import { describe, expect, it } from "vitest";

import { shareDialogOgImageUrl, sharedRecipeViewHref } from "./share-dialog";

describe("sharedRecipeViewHref", () => {
  it("prefers the absolute share URL from ensure-share", () => {
    expect(
      sharedRecipeViewHref("https://pantri.example/r/tok1234567890123456", "tok1234567890123456"),
    ).toBe("https://pantri.example/r/tok1234567890123456");
  });

  it("falls back to a same-origin path from the token", () => {
    expect(sharedRecipeViewHref(null, "tok1234567890123456")).toBe("/r/tok1234567890123456");
    expect(sharedRecipeViewHref(null, null)).toBeNull();
  });
});

describe("shareDialogOgImageUrl", () => {
  it("uses the server og URL when present", () => {
    expect(
      shareDialogOgImageUrl({
        ogImageUrlFromShare: "https://pantri.example/r/t/og.png?v=1",
        shareToken: "tok1234567890123456",
        shareUpdatedAt: "2026-01-02T03:04:05.000Z",
      }),
    ).toBe("https://pantri.example/r/t/og.png?v=1");
  });

  it("builds a versioned path from token and updatedAt", () => {
    expect(
      shareDialogOgImageUrl({
        ogImageUrlFromShare: null,
        shareToken: "tok1234567890123456",
        shareUpdatedAt: new Date("2026-01-02T03:04:05.000Z"),
      }),
    ).toBe("/r/tok1234567890123456/og.png?v=2026-01-02T03%3A04%3A05.000Z");
  });
});
