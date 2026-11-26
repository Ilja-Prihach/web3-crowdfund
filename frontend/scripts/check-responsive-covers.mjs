// Проверка выбора обложек на локальном demo-стенде с seed-кампаниями.
import assert from "node:assert/strict";
import { chromium } from "playwright";

const origin = process.env.OPENFUND_DEMO_URL ?? "http://localhost:3000";
const url = new URL(origin);
if (url.protocol !== "http:" || !["localhost", "127.0.0.1"].includes(url.hostname)) {
  throw new Error("Проверка разрешена только на локальном demo-стенде");
}

const browser = await chromium.launch({
  headless: true,
  ...(process.env.OPENFUND_CHROME_PATH ? { executablePath: process.env.OPENFUND_CHROME_PATH } : {}),
});
try {
  for (const [density, expectedWidth] of [[1, 400], [2, 800]]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: density });
    try {
      const page = await context.newPage();
      await page.goto(`${origin}/campaigns`, { waitUntil: "networkidle" });
      await page.getByText("Деморежим · локальная сеть и тестовые средства").waitFor();
      const image = page.locator('img[src*="/api/v1/media/covers/"]').first();
      await image.waitFor();
      await image.evaluate((element) => element.decode());
      const selected = await image.evaluate((element) => element.currentSrc);
      assert.equal(new URL(selected).searchParams.get("w"), String(expectedWidth));
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      console.log(`OK: DPR ${density} — ${expectedWidth} px`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}
