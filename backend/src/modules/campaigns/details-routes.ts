import fastifyMultipart from "@fastify/multipart";
import type { FastifyPluginCallbackTypebox } from "@fastify/type-provider-typebox";
import type { FastifyReply, FastifyRequest } from "fastify";
import { type Address, isAddressEqual } from "viem";

import type { Database } from "../../db/client.ts";
import { sepoliaCrowdfunding } from "../../indexer/events.ts";
import { CoverError, maxCoverBytes, processCover } from "../../media/cover.ts";
import type { MediaStorage } from "../../media/storage.ts";
import type { ApiError } from "../../shared/errors.ts";
import { createFixedWindowLimiter } from "../../shared/fixed-window.ts";
import { rejectForeignOrigin } from "../../shared/origin.ts";
import { requireSession } from "../auth/session.ts";
import { type CampaignDetailsRow, coverUrl, findDetails, replaceCover, saveDetails } from "./details.ts";
import {
  deleteCoverSchema,
  type DetailsInput,
  type DetailsJson,
  getCoverFileSchema,
  getDetailsSchema,
  putCoverSchema,
  putDetailsSchema,
} from "./schemas.ts";

export type DetailsRoutesDeps = {
  db: Database;
  media: MediaStorage;
  appOrigin: string;
  // Создатель кампании по контракту; null — кампании нет. Тест подставляет свою функцию вместо RPC.
  campaignCreator: (campaignId: bigint) => Promise<Address | null>;
  readsPerMinute: number;
  writesPerMinute: number;
  // Общий бюджет чтений creator из RPC на процесс: сессию может получить любой ключ, а квота RPC одна.
  creatorReadsPerMinute: number;
};

function toJson(row: CampaignDetailsRow | undefined): DetailsJson {
  return {
    category: row?.category ?? null,
    story: row?.story ?? null,
    budget: row?.budget ?? null,
    plan: row?.plan ?? null,
    risks: row?.risks ?? null,
    coverUrl: coverUrl(row?.coverKey ?? null),
    updatedAt: row?.updatedAt.toISOString() ?? null,
  };
}

// «Не заполнено» хранится как null: пустая строка, строка из пробелов и пустой список — тоже null.
const text = (value: string | null) => value?.trim() || null;
const list = <T>(value: T[] | null) => (value && value.length > 0 ? value : null);
const normalize = (input: DetailsInput) => ({
  category: input.category,
  story: text(input.story),
  budget: list(input.budget),
  plan: list(input.plan),
  risks: text(input.risks),
});

function sendError(reply: FastifyReply, statusCode: number, code: string, message: string) {
  const body: ApiError = { error: { code, message } };
  return reply.code(statusCode).send(body);
}

const campaignIdOf = (request: FastifyRequest) => BigInt((request.params as { id: string }).id);

// Детали и обложка кампании. Читать может любой, менять — только создатель по контракту.
export const detailsRoutes: FastifyPluginCallbackTypebox<DetailsRoutesDeps> = (app, deps, done) => {
  // Лимиты multipart срабатывают при чтении потока: файл больше 5 МБ не попадает в память целиком.
  void app.register(fastifyMultipart, { limits: { fileSize: maxCoverBytes, files: 1, fields: 0, parts: 1 } });
  app.addHook("onRequest", rejectForeignOrigin(deps.appOrigin));

  const reads = { rateLimit: { max: deps.readsPerMinute, timeWindow: 60_000 } };
  const writes = { rateLimit: { max: deps.writesPerMinute, timeWindow: 60_000 } };
  const allowCreatorRead = createFixedWindowLimiter(deps.creatorReadsPerMinute, 60_000);

  // После requireSession: анонимный запрос не тратит квоту RPC. Создатель читается из контракта при каждой записи:
  // проекция indexer отстаёт, а право решает контракт.
  async function requireCreator(request: FastifyRequest, reply: FastifyReply) {
    const { session } = request;
    if (!session) throw new Error("requireSession did not set request.session");
    if (!allowCreatorRead()) {
      request.log.warn("campaign creator reads exhausted");
      void reply.header("retry-after", "60");
      return sendError(reply, 503, "CHAIN_BUSY", "Too many requests to the chain, retry later");
    }

    let creator: Address | null;
    try {
      creator = await deps.campaignCreator(campaignIdOf(request));
    } catch (error) {
      request.log.warn({ err: error }, "campaign creator read failed");
      return sendError(reply, 503, "CHAIN_UNAVAILABLE", "Cannot read the campaign from the chain, retry later");
    }
    if (creator === null) return sendError(reply, 404, "CAMPAIGN_NOT_FOUND", "Campaign does not exist in the contract");
    if (!isAddressEqual(creator, session.address)) {
      return sendError(reply, 403, "NOT_CAMPAIGN_CREATOR", "Only the campaign creator can change its details");
    }
  }
  const creatorOnly = [requireSession(deps.db), requireCreator];

  // Отсутствие деталей — норма: 200 с null, а не 404. Кампании в контракте эта выдача не проверяет.
  app.get("/:id/details", { schema: getDetailsSchema, config: reads }, async (request) =>
    toJson(await findDetails(deps.db, sepoliaCrowdfunding, BigInt(request.params.id))),
  );

  app.put("/:id/details", { schema: putDetailsSchema, config: writes, preHandler: creatorOnly }, async (request) => {
    const address = request.session?.address ?? "";
    const row = await saveDetails(deps.db, sepoliaCrowdfunding, BigInt(request.params.id), normalize(request.body), address);
    return toJson(row);
  });

  app.put("/:id/cover", { schema: putCoverSchema, config: writes, preHandler: creatorOnly }, async (request, reply) => {
    const file = await request.file();
    if (!file) return sendError(reply, 400, "COVER_REQUIRED", "Send the cover as a multipart file field");

    let input: Buffer;
    try {
      input = await file.toBuffer();
    } catch (error) {
      if (error instanceof app.multipartErrors.RequestFileTooLargeError) {
        return sendError(reply, 413, "COVER_TOO_LARGE", `Cover must be at most ${maxCoverBytes} bytes`);
      }
      throw error;
    }

    let cover: Awaited<ReturnType<typeof processCover>>;
    try {
      cover = await processCover(input);
    } catch (error) {
      if (!(error instanceof CoverError)) throw error;
      return sendError(reply, error.code === "COVER_TOO_LARGE" ? 413 : 415, error.code, error.message);
    }

    // Сначала файл, потом строка: ссылка в базе никогда не указывает на файл, которого нет.
    await deps.media.put(cover.key, cover.data);
    const { row, orphanedKey } = await replaceCover(
      deps.db,
      sepoliaCrowdfunding,
      BigInt(request.params.id),
      cover.key,
      request.session?.address ?? "",
    );
    await deleteOrphan(request, orphanedKey);
    return toJson(row);
  });

  app.delete("/:id/cover", { schema: deleteCoverSchema, config: writes, preHandler: creatorOnly }, async (request) => {
    const { row, orphanedKey } = await replaceCover(
      deps.db,
      sepoliaCrowdfunding,
      BigInt(request.params.id),
      null,
      request.session?.address ?? "",
    );
    await deleteOrphan(request, orphanedKey);
    return toJson(row);
  });

  // Сбой удаления не портит ответ: строка уже указывает на новую обложку, остаётся только лишний файл.
  async function deleteOrphan(request: FastifyRequest, key: string | null) {
    if (key === null) return;
    await deps.media.delete(key).catch((error: unknown) => request.log.warn({ err: error, key }, "orphaned cover not deleted"));
  }

  done();
};

// Файлы обложек. Имя — sha256 содержимого, поэтому файл по адресу никогда не меняется и кэшируется навсегда.
export const mediaRoutes: FastifyPluginCallbackTypebox<Pick<DetailsRoutesDeps, "media" | "readsPerMinute">> = (
  app,
  deps,
  done,
) => {
  const config = { rateLimit: { max: deps.readsPerMinute, timeWindow: 60_000 } };

  app.get("/covers/:file", { schema: getCoverFileSchema, config }, async (request, reply) => {
    const data = await deps.media.get(`covers/${request.params.file}`);
    if (!data) return sendError(reply, 404, "MEDIA_NOT_FOUND", "Cover not found");
    return reply
      .header("content-type", "image/webp")
      .header("cache-control", "public, max-age=31536000, immutable")
      .send(data);
  });

  done();
};
