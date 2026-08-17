import { expect, test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";

const visualRoutes = [
  ["home", "/"],
  ["studio", "/studio"],
  ["pricing", "/pricing"],
  ["auth", "/login"],
  ["landing", "/ai-image-generator"],
] as const;

const viewports = [
  ["desktop", { width: 1440, height: 960 }],
  ["mobile", { width: 390, height: 844 }],
] as const;

for (const [routeName, route] of visualRoutes) {
  for (const [viewportName, viewport] of viewports) {
    test(`${routeName} renders at ${viewportName}`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto(route);
      await expect(page.locator("main[aria-busy='true']")).toHaveCount(0);
      await expect(page.locator("main")).toBeVisible();
      await expect
        .poll(() =>
          page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        )
        .toBe(true);
      await page.screenshot({
        path: testInfo.outputPath(`${routeName}-${viewportName}.png`),
        fullPage: true,
      });
    });
  }
}

test("studio tabs support keyboard navigation", async ({ page }) => {
  await page.goto("/studio");
  const imageTab = page.getByRole("tab").nth(0);
  await expect(imageTab).toBeVisible();
  await imageTab.focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tab").nth(1)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("参考图片")).toBeVisible();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab").nth(2)).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByLabel("需要朗读的文本")).toBeVisible();
  await page.keyboard.press("Home");
  await expect(imageTab).toHaveAttribute("aria-selected", "true");
});

test("video reference selection shows a local preview", async ({ page }) => {
  await page.goto("/studio");
  await page.getByRole("tab", { name: /视频/ }).click();
  await page
    .getByLabel("参考图片")
    .setInputFiles(
      path.join(process.cwd(), "public/media/phase11-gallery-portrait.jpg"),
    );
  await expect(page.getByText("已选择", { exact: true })).toBeVisible();
  await expect(page.locator(".uploadPreview")).toBeVisible();
});

test("reduced motion keeps the static media treatment", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(
    page.locator(".home-inspiration__item video").first(),
  ).toBeVisible();
  await expect(
    page.locator(".home-inspiration__item video").first(),
  ).toHaveJSProperty("muted", true);
  await page.goto("/ai-image-generator");
  await expect
    .poll(() =>
      page.locator(".marketing-creator-preview").evaluate((element) => {
        return Number.parseFloat(getComputedStyle(element).transitionDuration);
      }),
    )
    .toBeLessThanOrEqual(0.01);
});

test("public UI has no automated axe violations", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /一个工作区/ })).toBeVisible();
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("landing gallery media decode before capture", async ({ page }) => {
  await page.goto("/ai-image-generator");
  const firstImage = page.locator(".marketing-gallery img").first();
  await expect(firstImage).toBeVisible();
  await expect
    .poll(() =>
      firstImage.evaluate(
        (image) => image instanceof HTMLImageElement && image.naturalWidth > 0,
      ),
    )
    .toBe(true);
});

test("account stays behind the authentication boundary", async ({ page }) => {
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?.*next=%2Faccount/);
  await expect(page.getByRole("heading", { name: "登录" })).toBeVisible();
});

test("controlled session renders the Account overview", async ({
  page,
}, testInfo) => {
  const email = process.env.PHASE11_ACCOUNT_EMAIL;
  const password = process.env.PHASE11_ACCOUNT_PASSWORD;
  if (!email || !password) {
    test.skip(true, "Requires the controlled Phase 11 test user.");
    return;
  }

  await page.goto("/login?next=%2Faccount");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码").fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(
    page.getByRole("heading", { name: "Phase 11 QA" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "可用余额" })).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("account-signed-in-desktop.png"),
    fullPage: true,
  });
});
