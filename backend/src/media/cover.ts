import { createHash } from "node:crypto";

import sharp from "sharp";

// Обложка кампании: размер demo-обложек frontend, 16:9.
export const coverWidth = 1200;
export const coverHeight = 675;
export const maxCoverBytes = 5 * 1024 * 1024;
// Маленький PNG может развернуться в гигабайты пикселей («декомпрессионная бомба»). 40 Мп хватает любой камере телефона.
export const maxCoverPixels = 40_000_000;

// Варианты формируются из готового WebP, поэтому подходят и для уже загруженных обложек.
export function resizeCover(data: Buffer, width: 400 | 800): Promise<Buffer> {
  return sharp(data).resize({ width }).webp({ quality: 80 }).toBuffer();
}

const acceptedFormats = new Set(["jpeg", "png", "webp"]);

// Отказ с машинным кодом: маршрут переводит его в 4xx, а не в 500.
export class CoverError extends Error {
  readonly code: "COVER_TOO_LARGE" | "UNSUPPORTED_IMAGE";

  constructor(code: CoverError["code"], message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "CoverError";
    this.code = code;
  }
}

// Пережимает загруженный файл в WebP 1200×675 и возвращает его с ключом хранилища.
// Формат определяется по содержимому, а не по имени и Content-Type: их задаёт клиент.
// sharp не переносит метаданные без withMetadata(), поэтому EXIF с геолокацией в результат не попадает.
export async function processCover(input: Buffer): Promise<{ key: string; data: Buffer }> {
  if (input.length > maxCoverBytes) throw new CoverError("COVER_TOO_LARGE", `Cover is larger than ${maxCoverBytes} bytes`);

  const image = sharp(input, { limitInputPixels: maxCoverPixels, failOn: "error" });
  let format: string | undefined;
  try {
    ({ format } = await image.metadata());
  } catch (cause) {
    throw new CoverError("UNSUPPORTED_IMAGE", "File is not a readable image", { cause });
  }
  if (!format || !acceptedFormats.has(format)) {
    throw new CoverError("UNSUPPORTED_IMAGE", `Cover must be JPEG, PNG or WebP, got ${format ?? "unknown"}`);
  }

  let data: Buffer;
  try {
    data = await image
      // Поворот по EXIF Orientation до удаления метаданных: иначе снимок с телефона лёг бы набок.
      .rotate()
      // Заполнить кадр 16:9 и обрезать лишнее по центру, как object-fit: cover.
      .resize(coverWidth, coverHeight, { fit: "cover" })
      .webp({ quality: 80 })
      .toBuffer();
  } catch (cause) {
    // Сюда попадает и превышение limitInputPixels: его sharp проверяет при декодировании.
    throw new CoverError("UNSUPPORTED_IMAGE", "Image cannot be decoded", { cause });
  }

  // Имя — хэш результата: путь нельзя подобрать, одинаковый файл не плодит копий, а кэш браузера может быть вечным.
  const hash = createHash("sha256").update(data).digest("hex");
  return { key: `covers/${hash}.webp`, data };
}
