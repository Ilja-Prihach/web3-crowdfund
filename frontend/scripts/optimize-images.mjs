import { mkdir, stat } from "node:fs/promises";
import { dirname, resolve } from "node:path";

import sharp from "sharp";

const [inputArgument, outputArgument, widthArgument = "1600", qualityArgument = "82"] =
  process.argv.slice(2);

if (!inputArgument || !outputArgument) {
  console.error(
    "Использование: npm run optimize:images -- <input> <output> [max-width] [quality]",
  );
  process.exit(1);
}

const inputPath = resolve(inputArgument);
const outputPath = resolve(outputArgument);
const maxWidth = Number.parseInt(widthArgument, 10);
const quality = Number.parseInt(qualityArgument, 10);

if (!Number.isInteger(maxWidth) || maxWidth < 1) {
  throw new Error("max-width должен быть положительным целым числом");
}

if (!Number.isInteger(quality) || quality < 1 || quality > 100) {
  throw new Error("quality должен быть целым числом от 1 до 100");
}

await mkdir(dirname(outputPath), { recursive: true });

const source = sharp(inputPath).rotate();
const metadata = await source.metadata();

await source
  .resize({
    width: Math.min(metadata.width ?? maxWidth, maxWidth),
    withoutEnlargement: true,
  })
  .webp({
    effort: 6,
    quality,
    smartSubsample: true,
  })
  .toFile(outputPath);

const outputMetadata = await sharp(outputPath).metadata();
const outputFile = await stat(outputPath);

console.log(
  JSON.stringify(
    {
      input: inputPath,
      output: outputPath,
      width: outputMetadata.width,
      height: outputMetadata.height,
      bytes: outputFile.size,
      quality,
    },
    null,
    2,
  ),
);
