import { describe, expect, it } from "vitest";

import { addOddBitInput } from "~/services/odd-bits.service";

describe("addOddBitInput", () => {
  it("accepts a client UUID id", () => {
    const parsed = addOddBitInput.parse({
      id: "44444444-4444-4444-8444-444444444444",
      name: "bags",
    });
    expect(parsed.id).toBe("44444444-4444-4444-8444-444444444444");
    expect(parsed.name).toBe("bags");
  });

  it("allows omit id for server-generated inserts", () => {
    expect(addOddBitInput.parse({ name: "foil" }).id).toBeUndefined();
  });

  it("rejects non-uuid ids", () => {
    expect(() => addOddBitInput.parse({ id: "pending:1", name: "bags" })).toThrow();
  });
});
