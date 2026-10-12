import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  getIsOnline,
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
  });

  it("marks online when the probe reaches the origin (even with 404)", async () => {
    vi.stubGlobal("navigator", { onLine: true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404 })),
    );

    await expect(probeOnlineStatus()).resolves.toBe(true);
    expect(getIsOnline()).toBe(true);
  });
});
