import { describe, expect, it } from "vitest";

import {
  collectPendingOddBitAdds,
  queuedOfflinePendingOddBitIds,
  SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX,
} from "~/lib/offline/pending-odd-bit-adds";
import type { OutboxEntry } from "~/lib/offline/types";
import type { OddBit } from "~/lib/recipe-schema";
import { SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX } from "~/lib/shopping-local-merge";

function bit(overrides: Partial<OddBit> & Pick<OddBit, "id" | "name">): OddBit {
  return {
    amount: null,
    unit: null,
    purchased: false,
    ...overrides,
  };
}

function formData(entries: Record<string, string>) {
  const data = new FormData();
  for (const [key, value] of Object.entries(entries)) data.set(key, value);
  return data;
}

function outboxAdd(
  overrides: Partial<OutboxEntry> & { clientPendingId: string; name: string },
): OutboxEntry {
  const { clientPendingId, name, ...rest } = overrides;
  return {
    id: rest.id ?? `out-${clientPendingId}`,
    pantryId: "p1",
    createdAt: rest.createdAt ?? 1,
    actionPath: "/p/p1/shopping",
    status: rest.status ?? "pending",
    fields: {
      intent: "add-odd-bit",
      clientPendingId,
      name,
      ...(rest.fields ?? {}),
    },
    ...rest,
  };
}

describe("collectPendingOddBitAdds", () => {
  it("shows a single row from outbox while offline (no fetchers)", () => {
    const bits = collectPendingOddBitAdds(
      [],
      [outboxAdd({ clientPendingId: "pending:1", name: "bags" })],
      [],
    );
    expect(bits).toEqual([bit({ id: "pending:1", name: "bags" })]);
  });

  it("does not triple when drain formData, outbox, and loader all overlap", () => {
    const created = bit({ id: "ob2", name: "bags" });
    const bits = collectPendingOddBitAdds(
      [
        {
          key: `${SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX}p1`,
          state: "submitting",
          formData: formData({
            intent: "add-odd-bit",
            clientPendingId: "pending:1",
            name: "bags",
          }),
        },
      ],
      [outboxAdd({ clientPendingId: "pending:1", name: "bags" })],
      [created],
    );

    // Drain owns the in-flight id (outbox skipped); loader already has the
    // same name from a realtime revalidate → suppress pending entirely.
    expect(bits).toEqual([]);
  });

  it("shows one pending from drain while in-flight before the loader catches up", () => {
    const bits = collectPendingOddBitAdds(
      [
        {
          key: `${SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX}p1`,
          state: "submitting",
          formData: formData({
            intent: "add-odd-bit",
            clientPendingId: "pending:1",
            name: "bags",
          }),
        },
      ],
      [outboxAdd({ clientPendingId: "pending:1", name: "bags" })],
      [],
    );
    expect(bits).toEqual([bit({ id: "pending:1", name: "bags" })]);
  });

  it("suppresses outbox pending once drain settles with clientPendingId (revalidate race)", () => {
    const created = bit({ id: "ob2", name: "bags" });
    const bits = collectPendingOddBitAdds(
      [
        {
          key: `${SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX}p1`,
          state: "idle",
          data: { ok: true, oddBit: created, clientPendingId: "pending:1" },
        },
      ],
      [outboxAdd({ clientPendingId: "pending:1", name: "bags" })],
      [created],
    );

    expect(bits).toEqual([]);
  });

  it("shows the real id from reconcile until the loader catches up", () => {
    const created = bit({ id: "ob2", name: "bags" });
    const bits = collectPendingOddBitAdds(
      [
        {
          key: `${SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX}p1`,
          state: "idle",
          data: { ok: true, oddBit: created, clientPendingId: "pending:1" },
        },
      ],
      [outboxAdd({ clientPendingId: "pending:1", name: "bags" })],
      [],
    );

    expect(bits).toEqual([created]);
  });

  it("uses drain formData alone when outbox is empty mid-drain", () => {
    const bits = collectPendingOddBitAdds(
      [
        {
          key: `${SHOPPING_OUTBOX_DRAIN_FETCHER_PREFIX}p1`,
          state: "submitting",
          formData: formData({
            intent: "add-odd-bit",
            clientPendingId: "pending:1",
            name: "bags",
          }),
        },
      ],
      [],
      [],
    );
    expect(bits).toEqual([bit({ id: "pending:1", name: "bags" })]);
  });

  it("dedupes the same pending id from add fetcher and outbox", () => {
    const bits = collectPendingOddBitAdds(
      [
        {
          key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}a`,
          state: "submitting",
          formData: formData({
            intent: "add-odd-bit",
            clientPendingId: "pending:1",
            name: "bags",
          }),
        },
      ],
      [outboxAdd({ clientPendingId: "pending:1", name: "bags" })],
      [],
    );
    expect(bits).toEqual([bit({ id: "pending:1", name: "bags" })]);
  });

  it("keeps online add-fetcher pending rows", () => {
    const bits = collectPendingOddBitAdds(
      [
        {
          key: `${SHOPPING_ADD_ODD_BIT_FETCHER_PREFIX}a`,
          state: "submitting",
          formData: formData({
            intent: "add-odd-bit",
            clientPendingId: "pending:1",
            name: "bags",
            amount: "2",
            unit: "rolls",
          }),
        },
      ],
      [],
      [],
    );
    expect(bits).toEqual([bit({ id: "pending:1", name: "bags", amount: 2, unit: "rolls" })]);
  });
});

describe("queuedOfflinePendingOddBitIds", () => {
  it("returns only pending outbox add ids", () => {
    const ids = queuedOfflinePendingOddBitIds([
      outboxAdd({ clientPendingId: "pending:1", name: "bags" }),
      outboxAdd({ clientPendingId: "pending:2", name: "foil", status: "failed" }),
      {
        id: "t1",
        pantryId: "p1",
        createdAt: 2,
        actionPath: "/p/p1/shopping",
        status: "pending",
        fields: { intent: "toggle-odd-bit", id: "ob1", purchased: "true" },
      },
    ]);
    expect([...ids]).toEqual(["pending:1"]);
  });
});
