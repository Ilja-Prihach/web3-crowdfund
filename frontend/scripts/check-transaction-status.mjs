// Сквозная проверка только для локального demo-стека: создаёт кампании и отправляет тестовый ETH.
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
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.setDefaultTimeout(20_000);
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));

async function role(name) {
  const expected = name === "Creator" ? "0xf39F" : "0x7099";
  if (await page.getByRole("button", { name: new RegExp(expected) }).count()) return;
  const connected = page.getByRole("button", { name: /0xf39F|0x7099/ });
  if (await connected.count()) {
    await connected.click();
    await page.getByRole("button", { name: "Сменить роль" }).click();
  } else {
    await page.getByRole("button", { name: /Подключить кошелёк|Выбрать роль/ }).first().click();
  }
  await page.getByRole("button", { name: `Demo ${name}` }).click();
  await page.getByRole("button", { name: new RegExp(expected) }).waitFor();
}

async function createCampaign(title, goal) {
  await page.goto(`${origin}/campaigns/new`);
  await role("Creator");
  await page.getByPlaceholder("Например, библиотека инструментов в подъезде").fill(title);
  await page.getByRole("textbox", { name: "Описание", exact: true }).fill("Проверка подтверждения транзакции в локальной сети.");
  await page.getByPlaceholder("0,05").fill(goal);
  await page.getByRole("radio", { name: /Открытая цель/ }).check({ force: true });
  await page.getByRole("button", { name: "Создать кампанию" }).click();
  await page.waitForURL(/\/campaigns\/\d+$/, { timeout: 60_000 });
}

async function confirmed(title) {
  const status = page.getByRole("heading", { name: title });
  await status.waitFor({ timeout: 60_000 });
  // Дожидаемся обновления чтений и убеждаемся, что успех не исчез сам.
  await page.waitForTimeout(4_000);
  assert.equal(await status.isVisible(), true, `Исчезло подтверждение «${title}»`);
  const panel = page.locator("section[aria-live='polite']").filter({ has: status });
  await panel.getByRole("button", { name: "Готово" }).click();
  await status.waitFor({ state: "hidden" });
  console.log(`OK: ${title}`);
}

try {
  await page.goto(origin);
  await page.getByText("Деморежим · локальная сеть и тестовые средства").waitFor();
  await createCampaign("Проверка возврата", "1");
  await role("Backer");
  await page.getByLabel("Сумма вклада, ETH").fill("0,1");
  await page.getByRole("button", { name: "Поддержать", exact: true }).click();
  await confirmed("Спасибо! Вклад в контракте");
  await page.getByRole("button", { name: /Вернуть вклад/ }).click();
  await confirmed("Вклад вернулся");
  await role("Creator");
  await page.getByRole("button", { name: "Отменить сбор", exact: true }).click();
  await page.getByRole("button", { name: "Да, отменить сбор" }).click();
  await confirmed("Сбор отменён");

  await createCampaign("Проверка вывода", "0,01");
  await role("Backer");
  await page.getByLabel("Сумма вклада, ETH").fill("0,01");
  await page.getByRole("button", { name: "Поддержать", exact: true }).click();
  await confirmed("Спасибо! Вклад в контракте");
  await role("Creator");
  await page.getByRole("button", { name: /Вывести средства/ }).click();
  await confirmed("Средства выведены");
  assert.deepEqual(errors, [], "Ошибки JavaScript в браузере");
} finally {
  await browser.close();
}
