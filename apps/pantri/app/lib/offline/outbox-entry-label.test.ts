import { describe, expect, it } from "vitest";

import { outboxEntryLabel } from "~/lib/offline/outbox-entry-label";
import type { OutboxEntry } from "~/lib/offline/types";

function entry(fields: Record<string, string>): OutboxEntry {
  return {
    id: "obx_1",
    pantryId: "p1",
    createdAt: 1,
    actionPath: "/p1/shopping",
    fields,
    status: "pending",
  };
}

describe("outboxEntryLabel", () => {
  it("labels odd-bit and sorted intents", () => {
    expect(outboxEntryLabel(entry({ intent: "add-from-recipe", name: "Chili" }))).toBe(
      "Add recipe “Chili”",
    );
    expect(outboxEntryLabel(entry({ intent: "add-odd-bit", name: "milk" }))).toBe(
      "Add odd bit “milk”",
    );
    expect(outboxEntryLabel(entry({ intent: "toggle-odd-bit", purchased: "true" }))).toBe(
      "Check odd bit",
    );
    expect(outboxEntryLabel(entry({ intent: "toggle", name: "onion", purchased: "false" }))).toBe(
      "Uncheck “onion”",
    );
    expect(
      outboxEntryLabel(entry({ intent: "set-category", name: "flour", section: "Dry goods" })),
    ).toBe("Move “flour” to Dry goods");
  });
});
