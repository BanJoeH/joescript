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
    let idleCb: IdleRequestCallback | null = null;

    vi.stubGlobal("requestIdleCallback", (cb: IdleRequestCallback) => {
      idleCb = cb;
      return 1;
    });
    vi.stubGlobal("cancelIdleCallback", () => {
      idleCb = null;
    });

    scheduleDeferredWork(() => runs.push(1));
    scheduleDeferredWork(() => runs.push(2));
    expect(runs).toEqual([]);

    idleCb?.({ didTimeout: false, timeRemaining: () => 10 } as IdleDeadline);
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
