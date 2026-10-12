import { describe, expect, it } from "vitest";

import {
  clearActiveDrainEntry,
  getActiveDrainEntry,
  setActiveDrainEntry,
} from "~/lib/offline/drain-active";

describe("drain-active", () => {
  it("tracks the active outbox entry per pantry across remounts", () => {
    clearActiveDrainEntry("p1");
    expect(getActiveDrainEntry("p1")).toBeNull();

    setActiveDrainEntry("p1", "entry-a");
    expect(getActiveDrainEntry("p1")).toBe("entry-a");

    clearActiveDrainEntry("p1", "entry-b");
    expect(getActiveDrainEntry("p1")).toBe("entry-a");

    clearActiveDrainEntry("p1", "entry-a");
    expect(getActiveDrainEntry("p1")).toBeNull();
  });
});
