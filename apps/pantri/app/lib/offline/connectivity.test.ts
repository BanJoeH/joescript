import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  canUseNetwork,
  getIsOnline,
  hasConnectivitySettled,
  probeOnlineStatus,
  resetConnectivityForTests,
} from "~/lib/offline/connectivity";

beforeEach(() => {
  resetConnectivityForTests(true);
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetConnectivityForTests(true);
});

describe("probeOnlineStatus", () => {
  it("marks offline when navigator.onLine is false without fetching", async () => {
    vi.stubGlobal("navigator", { onLine: false });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(probeOnlineStatus()).resolves.toBe(false);
    expect(getIsOnline()).toBe(false);
    expect(canUseNetwork()).toBe(false);
    expect(hasConnectivitySettled()).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("marks offline when the probe fetch fails (SW Offline / lie-fi)", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );

    await expect(probeOnlineStatus()).resolves.toBe(false);
    expect(getIsOnline()).toBe(false);
    expect(canUseNetwork()).toBe(false);
  });

  it("marks online when the probe reaches the origin (even with 404)", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404 })),
    );

    await expect(probeOnlineStatus()).resolves.toBe(true);
    expect(getIsOnline()).toBe(true);
    expect(canUseNetwork()).toBe(true);
  });

  it("stops offline polling once the probe succeeds again", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    const setIntervalSpy = vi.spyOn(globalThis, "setInterval");
    const clearIntervalSpy = vi.spyOn(globalThis, "clearInterval");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    await probeOnlineStatus();
    expect(getIsOnline()).toBe(false);
    expect(setIntervalSpy).toHaveBeenCalled();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 204 })),
    );
    await probeOnlineStatus();
    expect(getIsOnline()).toBe(true);
    expect(clearIntervalSpy).toHaveBeenCalled();

    setIntervalSpy.mockRestore();
    clearIntervalSpy.mockRestore();
  });
});
