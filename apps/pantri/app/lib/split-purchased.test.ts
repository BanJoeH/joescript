import { describe, expect, it } from "vitest";

import { splitIndexedByPurchased } from "~/lib/split-purchased";

describe("splitIndexedByPurchased", () => {
  it("keeps source indexes while splitting to-buy / got-it, sorted by name", () => {
    const items = [
      { name: "zucchini", purchased: false },
      { name: "butter", purchased: true },
      { name: "apples", purchased: false },
      { name: "milk", purchased: true },
    ];

    expect(splitIndexedByPurchased(items)).toEqual({
      toBuy: [
        { item: items[2], index: 2 },
        { item: items[0], index: 0 },
      ],
      gotIt: [
        { item: items[1], index: 1 },
        { item: items[3], index: 3 },
      ],
    });
  });
});
