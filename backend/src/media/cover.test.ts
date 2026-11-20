import assert from "node:assert/strict";
import { describe, it } from "node:test";

import sharp from "sharp";

import { CoverError, coverHeight, coverWidth, maxCoverBytes, processCover } from "./cover.ts";

const red = { r: 220, g: 40, b: 40 };
const blue = { r: 40, g: 40, b: 220 };

// Снимок «как с телефона»: левая половина красная, правая синяя, в EXIF — поворот и координаты.
async function phonePhoto({ width = 1600, height = 900, orientation = 1 } = {}) {
  const half = await sharp({ create: { width: width / 2, height, channels: 3, background: blue } }).png().toBuffer();
  return sharp({ create: { width, height, channels: 3, background: red } })
    .composite([{ input: half, left: width / 2, top: 0 }])
    .jpeg()
    .withMetadata({ orientation })
    .withExifMerge({ IFD3: { GPSLatitudeRef: "N", GPSLatitude: "53/1 54/1 0/1" } })
    .toBuffer();
}

async function pixel(data: Buffer, left: number, top: number) {
  const { data: raw } = await sharp(data).extract({ left, top, width: 1, height: 1 }).raw().toBuffer({ resolveWithObject: true });
  return { r: raw[0] ?? 0, b: raw[2] ?? 0 };
}

async function rejectsWithCode(code: CoverError["code"], input: Promise<unknown>) {
  await assert.rejects(input, (error) => error instanceof CoverError && error.code === code);
}

describe("processCover", () => {
  it("пережимает JPEG в WebP 1200×675 без EXIF и называет файл хэшем результата", async () => {
    const input = await phonePhoto();
    assert.ok((await sharp(input).metadata()).exif, "у исходника есть EXIF с координатами");

    const { key, data } = await processCover(input);
    const meta = await sharp(data).metadata();

    assert.equal(meta.format, "webp");
    assert.equal(meta.width, coverWidth);
    assert.equal(meta.height, coverHeight);
    assert.equal(meta.exif, undefined);
    assert.match(key, /^covers\/[0-9a-f]{64}\.webp$/);
    assert.equal((await processCover(input)).key, key, "тот же файл — тот же ключ");
  });

  it("поворачивает снимок по EXIF Orientation до удаления метаданных", async () => {
    // Orientation 6: показать с поворотом на 90° по часовой — левая красная половина оказывается сверху.
    const { data } = await processCover(await phonePhoto({ orientation: 6 }));

    const top = await pixel(data, 50, 50);
    const bottom = await pixel(data, 50, coverHeight - 50);
    assert.ok(top.r > 150 && top.b < 100, `сверху красный, получено ${JSON.stringify(top)}`);
    assert.ok(bottom.b > 150 && bottom.r < 100, `снизу синий, получено ${JSON.stringify(bottom)}`);
  });

  it("принимает PNG и WebP", async () => {
    const image = sharp({ create: { width: 800, height: 450, channels: 3, background: red } });
    for (const input of [await image.clone().png().toBuffer(), await image.clone().webp().toBuffer()]) {
      assert.equal((await sharp((await processCover(input)).data).metadata()).format, "webp");
    }
  });

  it("определяет формат по содержимому: отклоняет SVG и GIF", async () => {
    await rejectsWithCode("UNSUPPORTED_IMAGE", processCover(Buffer.from("<svg onload=alert(1)>")));
    const gif = await sharp({ create: { width: 10, height: 10, channels: 3, background: red } }).gif().toBuffer();
    await rejectsWithCode("UNSUPPORTED_IMAGE", processCover(gif));
  });

  it("отклоняет оборванный файл, а не дорисовывает его серым", async () => {
    // Без failOn sharp декодировал бы половину JPEG и залил остаток: обложка выглядела бы битой.
    const photo = await phonePhoto();
    await rejectsWithCode("UNSUPPORTED_IMAGE", processCover(photo.subarray(0, Math.floor(photo.length / 2))));
  });

  it("отклоняет файл больше 5 МБ и картинку больше 40 Мп", async () => {
    await rejectsWithCode("COVER_TOO_LARGE", processCover(Buffer.alloc(maxCoverBytes + 1)));
    // 8000×6000 = 48 Мп, а PNG одного цвета весит килобайты: размер файла такую бомбу не остановит.
    const bomb = await sharp({ create: { width: 8000, height: 6000, channels: 3, background: red } }).png().toBuffer();
    assert.ok(bomb.length < maxCoverBytes);
    await rejectsWithCode("UNSUPPORTED_IMAGE", processCover(bomb));
  });
});
