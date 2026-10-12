import { afterEach, describe, expect, it, vi } from "vitest";

import { cancelDeferredWork, scheduleDeferredWork } from "~/lib/offline/schedule-deferred";

afterEach(() => {
  cancelDeferredWork();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("scheduleDeferredWork", () => {
  it("coalesces rapid calls into a single idle run", () => {
    vi.useFakeTimers();
    const runs: number[] = [];
    const captured: { cb: ((deadline: IdleDeadline) => void) | null } = { cb: null };

    vi.stubGlobal("requestIdleCallback", (cb: (deadline: IdleDeadline) => void) => {
      captured.cb = cb;
      return 1;
    });
    vi.stubGlobal("cancelIdleCallback", () => {
      captured.cb = null;
    });

    scheduleDeferredWork(() => runs.push(1));
    scheduleDeferredWork(() => runs.push(2));
    expect(runs).toEqual([]);

    if (!captured.cb) throw new Error("expected idle callback");
    captured.cb({ didTimeout: false, timeRemaining: () => 10 });
    expect(runs).toEqual([2]);
  });

  it("falls back to timeout when idle callback is unavailable", () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", undefined);
    vi.stubGlobal("cancelIdleCallback", undefined);

    const runs: number[] = [];
    scheduleDeferredWork(() => runs.push(1), { timeoutMs: 2000 });
    expect(runs).toEqual([]);
    vi.advanceTimersByTime(500);
    expect(runs).toEqual([1]);
  });
});
