import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import sharp from "sharp";
import type { Address } from "viem";

import { type AppDeps, buildApp } from "../../app.ts";
import { campaignDetails, chainEvents } from "../../db/schema.ts";
import { sepoliaCrowdfunding } from "../../indexer/events.ts";
import { maxCoverBytes } from "../../media/cover.ts";
import type { ApiError } from "../../shared/errors.ts";
import { createMemoryMediaStorage, testAppOrigin, testDeps } from "../../test/app.ts";
import { signInForCookie } from "../../test/auth.ts";
import { createTestDatabase, resetTestDatabase } from "../../test/database.ts";
import type { DetailsInput, DetailsJson } from "./schemas.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));

const stranger = "0x5afe000000000000000000000000000000000005" as Address;
const emptyDetails: DetailsJson = {
  category: null,
  story: null,
  budget: null,
  plan: null,
  risks: null,
  coverUrl: null,
  updatedAt: null,
};
const form: DetailsInput = {
  category: "education",
  story: "Открытый лекторий по Solidity для студентов колледжа.",
  budget: [{ label: "Аренда зала", amount: "100000000000000000" }],
  plan: [{ period: "Декабрь", task: "Четыре лекции и запись" }],
  risks: "Зал могут не дать в выбранные даты.",
};

const errorCode = (response: { json: <T>() => T }) => response.json<ApiError>().error.code;

const recordDonation = (campaignId: bigint) =>
  db.insert(chainEvents).values({
    chainId: sepoliaCrowdfunding.chainId,
    contractAddress: sepoliaCrowdfunding.address.toLowerCase(),
    blockNumber: 1n,
    blockTimestamp: new Date(),
    txHash: `0x${"1".repeat(64)}`,
    logIndex: 0,
    eventName: "DonationMade",
    campaignId,
    args: { donor: stranger.toLowerCase(), amount: "1" },
  });

// Приложение, где создатель кампаний 0 и 1 — вошедший пользователь, кампании 2 нет в контракте.
async function signedInApp(overrides: Partial<AppDeps> = {}) {
  const { address, sessionId } = await signInForCookie(db);
  const creatorCalls: bigint[] = [];
  let totalRaised = 0n;
  const media = createMemoryMediaStorage();
  const app = buildApp(
    testDeps(db, {
      media,
      campaignEditState: (id) => {
        creatorCalls.push(id);
        return Promise.resolve(id < 2n ? { creator: address, totalRaised } : null);
      },
      ...overrides,
    }),
  );
  after(() => app.close());
  const cookies = { openfund_session: sessionId };
  const headers = { origin: testAppOrigin };
  return { app, address, media, creatorCalls, cookies, headers, setTotalRaised: (value: bigint) => (totalRaised = value) };
}

function coverForm(image: Buffer) {
  const body = new FormData();
  body.append("cover", new Blob([new Uint8Array(image)]), "cover.png");
  return body;
}

const png = (background = { r: 30, g: 90, b: 60 }) =>
  sharp({ create: { width: 1600, height: 900, channels: 3, background } }).png().toBuffer();

describe("GET /v1/campaigns/:id/details", () => {
  it("отдаёт null-поля, если создатель ничего не заполнял: это норма, а не 404", async () => {
    const app = buildApp(testDeps(db));
    const response = await app.inject({ method: "GET", url: "/v1/campaigns/0/details" });
    await app.close();

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), emptyDetails);
  });
});

describe("PUT /v1/campaigns/:id/details", () => {
  it("сохраняет форму создателя и отдаёт её при чтении", async () => {
    const { app, address, cookies, headers } = await signedInApp();

    const saved = await app.inject({ method: "PUT", url: "/v1/campaigns/0/details", cookies, headers, payload: form });
    assert.equal(saved.statusCode, 200);
    const read = await app.inject({ method: "GET", url: "/v1/campaigns/0/details" });

    const { updatedAt, ...fields } = read.json<DetailsJson>();
    assert.deepEqual(fields, { ...form, coverUrl: null });
    assert.ok(updatedAt);
    const [row] = await db.select().from(campaignDetails);
    assert.equal(row?.updatedBy, address.toLowerCase());
  });

  it("хранит пустой текст, пробелы и пустой список как «не заполнено»", async () => {
    const { app, cookies, headers } = await signedInApp();
    const payload = { ...form, story: "   ", budget: [], risks: "" };

    const response = await app.inject({ method: "PUT", url: "/v1/campaigns/0/details", cookies, headers, payload });

    assert.equal(response.statusCode, 200);
    const body = response.json<DetailsJson>();
    assert.deepEqual([body.story, body.budget, body.risks], [null, null, null]);
  });

  it("без сессии — 401, и квоту RPC анонимный запрос не тратит", async () => {
    const { app, creatorCalls, headers } = await signedInApp();

    const response = await app.inject({ method: "PUT", url: "/v1/campaigns/0/details", headers, payload: form });

    assert.equal(response.statusCode, 401);
    assert.deepEqual(creatorCalls, []);
    assert.equal(await db.$count(campaignDetails), 0);
  });

  it("с чужим Origin — 403 даже при действующей сессии", async () => {
    const { app, cookies } = await signedInApp();
    const headers = { origin: "https://evil.example" };

    const response = await app.inject({ method: "PUT", url: "/v1/campaigns/0/details", cookies, headers, payload: form });

    assert.equal(response.statusCode, 403);
    assert.equal(errorCode(response), "ORIGIN_FORBIDDEN");
    assert.equal(await db.$count(campaignDetails), 0);
  });

  it("не создатель — 403, нет кампании в контракте — 404, RPC недоступен — 503", async () => {
    const notCreator = await signedInApp({
      campaignEditState: () => Promise.resolve({ creator: stranger, totalRaised: 0n }),
    });
    const missing = await signedInApp();
    const down = await signedInApp({
      campaignEditState: () => Promise.reject(new Error("connect ECONNREFUSED")),
    });
    const put = ({ app, cookies, headers }: Awaited<ReturnType<typeof signedInApp>>, id: number) =>
      app.inject({ method: "PUT", url: `/v1/campaigns/${id}/details`, cookies, headers, payload: form });

    const forbidden = await put(notCreator, 0);
    const notFound = await put(missing, 2);
    const unavailable = await put(down, 0);

    assert.deepEqual(
      [forbidden, notFound, unavailable].map((response) => [response.statusCode, errorCode(response)]),
      [
        [403, "NOT_CAMPAIGN_CREATOR"],
        [404, "CAMPAIGN_NOT_FOUND"],
        [503, "CHAIN_UNAVAILABLE"],
      ],
    );
    assert.equal(await db.$count(campaignDetails), 0);
  });

  it("отклоняет неизвестную категорию, нулевую и дробную сумму, пустую строку бюджета, длинную историю и план", async () => {
    const { app, cookies, headers } = await signedInApp();
    const bad: unknown[] = [
      { ...form, category: "games" },
      { ...form, budget: [{ label: "Зал", amount: "0" }] },
      { ...form, budget: [{ label: "   ", amount: "1" }] },
      { ...form, budget: [{ label: "Зал", amount: "0.5" }] },
      { ...form, story: "a".repeat(10_001) },
      { ...form, plan: Array(13).fill({ period: "Май", task: "Лекция" }) },
    ];

    for (const payload of bad) {
      const response = await app.inject({ method: "PUT", url: "/v1/campaigns/0/details", cookies, headers, payload: payload as object });
      assert.equal(response.statusCode, 400, JSON.stringify(payload).slice(-60));
    }
    assert.equal(await db.$count(campaignDetails), 0);
  });

  it("лишние поля отбрасывает, а не сохраняет", async () => {
    const { app, cookies, headers } = await signedInApp();
    // Fastify проверяет тело через ajv с removeAdditional: поле вне схемы удаляется до обработчика.
    const payload = { ...form, updatedBy: stranger, coverUrl: "/v1/media/covers/evil.webp" };

    const response = await app.inject({ method: "PUT", url: "/v1/campaigns/0/details", cookies, headers, payload });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<DetailsJson>().coverUrl, null);
    const [row] = await db.select().from(campaignDetails);
    assert.notEqual(row?.updatedBy, stranger);
  });

  it("ограничивает чтения creator из RPC общим бюджетом на процесс", async () => {
    const { app, cookies, headers } = await signedInApp({ creatorReadsPerMinute: 1 });
    const put = () => app.inject({ method: "PUT", url: "/v1/campaigns/0/details", cookies, headers, payload: form });

    assert.equal((await put()).statusCode, 200);
    const busy = await put();

    assert.equal(busy.statusCode, 503);
    assert.equal(errorCode(busy), "CHAIN_BUSY");
    assert.equal(busy.headers["retry-after"], "60");
  });

  it("после первого пожертвования блокирует детали и обложку без изменений в базе и хранилище", async () => {
    const { app, media, cookies, headers, setTotalRaised } = await signedInApp();
    const initial = await app.inject({ method: "PUT", url: "/v1/campaigns/0/details", cookies, headers, payload: form });
    await app.inject({ method: "PUT", url: "/v1/campaigns/0/cover", cookies, headers, payload: coverForm(await png()) });
    const before = await app.inject({ method: "GET", url: "/v1/campaigns/0/details" });
    const filesBefore = [...media.files.entries()];
    setTotalRaised(1n);

    const responses = await Promise.all([
      app.inject({
        method: "PUT",
        url: "/v1/campaigns/0/details",
        cookies,
        headers,
        payload: { ...form, story: "Изменённая история" },
      }),
      app.inject({
        method: "PUT",
        url: "/v1/campaigns/0/cover",
        cookies,
        headers,
        payload: coverForm(await png({ r: 200, g: 60, b: 40 })),
      }),
      app.inject({ method: "DELETE", url: "/v1/campaigns/0/cover", cookies, headers }),
    ]);

    assert.equal(initial.statusCode, 200);
    assert.deepEqual(
      responses.map((response) => [response.statusCode, errorCode(response)]),
      Array(3).fill([409, "CAMPAIGN_DETAILS_LOCKED"]),
    );
    const after = await app.inject({ method: "GET", url: "/v1/campaigns/0/details" });
    assert.deepEqual(after.json(), before.json());
    assert.deepEqual([...media.files.entries()], filesBefore);
  });

  it("сохраняет блокировку после полного возврата, когда totalRaised снова равен нулю", async () => {
    const { app, cookies, headers } = await signedInApp();
    await recordDonation(0n);

    const response = await app.inject({ method: "PUT", url: "/v1/campaigns/0/details", cookies, headers, payload: form });

    assert.equal(response.statusCode, 409);
    assert.equal(errorCode(response), "CAMPAIGN_DETAILS_LOCKED");
    assert.equal(await db.$count(campaignDetails), 0);
  });
});

describe("обложка кампании", () => {
  it("пережимает загрузку, отдаёт её с вечным кэшем и удаляет прежний файл при замене", async () => {
    const { app, media, cookies, headers } = await signedInApp();
    const upload = async (image: Buffer) =>
      app.inject({ method: "PUT", url: "/v1/campaigns/0/cover", cookies, headers, payload: coverForm(image) });

    const first = await upload(await png());
    assert.equal(first.statusCode, 200);
    const { coverUrl } = first.json<DetailsJson>();
    assert.match(coverUrl ?? "", /^\/v1\/media\/covers\/[0-9a-f]{64}\.webp$/);

    const file = await app.inject({ method: "GET", url: coverUrl ?? "" });
    assert.equal(file.statusCode, 200);
    assert.equal(file.headers["content-type"], "image/webp");
    assert.equal(file.headers["cache-control"], "public, max-age=31536000, immutable");
    assert.deepEqual(await sharp(file.rawPayload).metadata().then(({ width, height }) => [width, height]), [1200, 675]);

    const second = await upload(await png({ r: 200, g: 60, b: 40 }));
    assert.notEqual(second.json<DetailsJson>().coverUrl, coverUrl);
    assert.equal(media.files.size, 1, "прежний файл удалён");
  });

  it("не удаляет файл, если та же картинка стоит у другой кампании", async () => {
    const { app, media, cookies, headers } = await signedInApp();
    const image = await png();
    for (const id of [0, 1]) {
      await app.inject({ method: "PUT", url: `/v1/campaigns/${id}/cover`, cookies, headers, payload: coverForm(image) });
    }

    const removed = await app.inject({ method: "DELETE", url: "/v1/campaigns/0/cover", cookies, headers });

    assert.equal(removed.json<DetailsJson>().coverUrl, null);
    assert.equal(media.files.size, 1, "файл нужен кампании 1");
    await app.inject({ method: "DELETE", url: "/v1/campaigns/1/cover", cookies, headers });
    assert.equal(media.files.size, 0);
  });

  it("сохраняет обложку без текстов и тексты без обложки независимо", async () => {
    const { app, cookies, headers } = await signedInApp();
    await app.inject({ method: "PUT", url: "/v1/campaigns/0/cover", cookies, headers, payload: coverForm(await png()) });

    const saved = await app.inject({ method: "PUT", url: "/v1/campaigns/0/details", cookies, headers, payload: form });

    assert.ok(saved.json<DetailsJson>().coverUrl, "сохранение текстов не стирает обложку");
  });

  it("отклоняет запрос без файла, GIF и файл больше 5 МБ, не записывая ничего", async () => {
    const { app, media, cookies, headers } = await signedInApp();
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: "#fff" } }).gif().toBuffer();
    const put = (payload: FormData) => app.inject({ method: "PUT", url: "/v1/campaigns/0/cover", cookies, headers, payload });

    const empty = await put(new FormData());
    const unsupported = await put(coverForm(gif));
    const tooLarge = await put(coverForm(Buffer.alloc(maxCoverBytes + 1)));

    assert.deepEqual(
      [empty, unsupported, tooLarge].map((response) => [response.statusCode, errorCode(response)]),
      [
        [400, "COVER_REQUIRED"],
        [415, "UNSUPPORTED_IMAGE"],
        [413, "COVER_TOO_LARGE"],
      ],
    );
    assert.equal(media.files.size, 0);
    assert.equal(await db.$count(campaignDetails), 0);
  });

  it("на неизвестный и подозрительный файл отвечает 404 и 400", async () => {
    const app = buildApp(testDeps(db));
    const missing = await app.inject({ method: "GET", url: `/v1/media/covers/${"a".repeat(64)}.webp` });
    const traversal = await app.inject({ method: "GET", url: "/v1/media/covers/..%2F..%2Fetc%2Fpasswd" });
    await app.close();

    assert.equal(missing.statusCode, 404);
    assert.equal(errorCode(missing), "MEDIA_NOT_FOUND");
    assert.equal(traversal.statusCode, 400);
  });
});
