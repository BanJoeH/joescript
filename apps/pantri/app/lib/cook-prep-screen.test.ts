import { describe, expect, it } from "vitest";

import { cookPrepScreenTitle } from "./cook-prep-screen";

describe("cookPrepScreenTitle", () => {
  it("labels the first cook screen from description and ingredient count", () => {
    expect(cookPrepScreenTitle("Intro blurb", 3)).toBe("Prep");
    expect(cookPrepScreenTitle("Intro blurb", 0)).toBe("About");
    expect(cookPrepScreenTitle(null, 2)).toBe("Ingredients");
    expect(cookPrepScreenTitle("  ", 1)).toBe("Ingredients");
  });
});
