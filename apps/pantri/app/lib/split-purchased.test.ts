import { describe, expect, it } from "vitest";

import { splitIndexedByPurchased } from "~/lib/split-purchased";

describe("splitIndexedByPurchased", () => {
  it("keeps source indexes while splitting to-buy / got-it", () => {
    const items = [
      { name: "a", purchased: false },
      { name: "b", purchased: true },
      { name: "c", purchased: false },
      { name: "d", purchased: true },
    ];

    expect(splitIndexedByPurchased(items)).toEqual({
      toBuy: [
        { item: items[0], index: 0 },
        { item: items[2], index: 2 },
      ],
      gotIt: [
        { item: items[1], index: 1 },
        { item: items[3], index: 3 },
      ],
    });
  });
});
