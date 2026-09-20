import { expect, test } from "@playwright/test";

const widths = [320, 375, 768, 1024, 1440];

test("homepage reaches the reporting case study", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "I build web products that hold up in production.",
    }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Download CV" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "Download CV" }).first()).toHaveAttribute(
    "href",
    "/cv.pdf",
  );
  await expect(page.getByRole("link", { name: "View Pantri" })).toBeVisible();
  await expect(page.getByText("Card payments before a 30-day invoice")).toHaveCount(0);

  await page.getByRole("link", { name: /Read the full case study/ }).click();
  await expect(page).toHaveURL(/\/case-studies\/reporting$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Rebuilding a reporting system without buying a new database",
  );
});

test("a mock project page is reachable", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "View Pantri" }).click();
  await expect(page).toHaveURL(/\/work\/pantri$/);
  await expect(page.getByRole("heading", { level: 1, name: "Pantri" })).toBeVisible();
  await page
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "Home" })
    .click();
  await expect(page).toHaveURL("/");
});

test("unpublished case studies are not found", async ({ page }) => {
  const response = await page.goto("/case-studies/stripe");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("keyboard users can reach a project and the case study", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Joe Harrison" })).toBeFocused();

  const study = page.getByRole("link", { name: /Read the full case study/ });
  const project = page.getByRole("link", { name: "View Pantri" });
  for (let step = 0; step < 8; step += 1) {
    if (await study.evaluate((element) => element === document.activeElement)) {
      break;
    }
    await page.keyboard.press("Tab");
  }
  await expect(study).toBeFocused();

  for (let step = 0; step < 8; step += 1) {
    if (await project.evaluate((element) => element === document.activeElement)) {
      break;
    }
    await page.keyboard.press("Tab");
  }
  await expect(project).toBeFocused();
});

test("pages do not scroll sideways", async ({ page }) => {
  for (const path of ["/", "/case-studies/reporting"]) {
    await page.goto(path);
    for (const width of widths) {
      await page.setViewportSize({ width, height: 900 });
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(scrollWidth).toBeLessThanOrEqual(width);
    }
  }
});

test("200% zoom does not overflow the homepage", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/");
  await page.evaluate(() => {
    document.documentElement.style.zoom = "2";
  });
  const overflows = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth > root.clientWidth;
  });
  expect(overflows).toBe(false);
});

test("reduced motion removes transitions", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const duration = await page
    .locator(".text-link")
    .first()
    .evaluate((element) => {
      return getComputedStyle(element).transitionDuration;
    });
  expect(duration).toBe("0s");
});

test("light and dark schemes use the specified backgrounds", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(245, 241, 235)");

  await page.emulateMedia({ colorScheme: "dark" });
  await page.reload();
  await expect(page.locator("body")).toHaveCSS("background-color", "rgb(23, 19, 19)");
});
