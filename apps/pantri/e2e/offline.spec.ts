import { expect, test } from "@playwright/test";

/**
 * Offline shell smoke tests against `public/`.
 * Shopping toggle queue/drain is covered by vitest + fake-indexeddb.
 */
test.describe("offline shell", () => {
  test("serves service worker and offline fallback page", async ({ request }) => {
    const sw = await request.get("/sw.js");
    expect(sw.ok()).toBe(true);
    const swBody = await sw.text();
    expect(swBody).toContain("pantri-v3");
    expect(swBody).toContain("offline.html");
    expect(swBody).toContain("PRECACHE_SHELLS");
    expect(swBody).toContain("photos");

    const offline = await request.get("/offline.html");
    expect(offline.ok()).toBe(true);
    expect(await offline.text()).toContain("You're offline");

    const manifest = await request.get("/site.webmanifest");
    expect(manifest.ok()).toBe(true);
    const json = (await manifest.json()) as { start_url?: string };
    expect(json.start_url).toBe("/");
  });

  test("can register the service worker from a same-origin page", async ({ page, context }) => {
    await page.goto("/offline.html");
    await page.evaluate(() => navigator.serviceWorker.register("/sw.js"));

    await expect
      .poll(async () => {
        const workers = await context.serviceWorkers();
        return workers.some((worker) => worker.url().includes("/sw.js"));
      })
      .toBe(true);
  });

  test("setOffline reports navigator.onLine false", async ({ page, context }) => {
    await page.goto("/offline.html");
    await context.setOffline(true);
    expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  });
});
