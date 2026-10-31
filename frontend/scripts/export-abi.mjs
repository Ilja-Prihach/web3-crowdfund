import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const artifactPath = resolve(frontendRoot, "../contracts/out/Crowdfunding.sol/Crowdfunding.json");
const outputPath = resolve(frontendRoot, "src/shared/config/crowdfundingAbi.ts");

const { abi } = JSON.parse(await readFile(artifactPath, "utf8"));

if (!Array.isArray(abi) || abi.length === 0) {
  throw new Error("ABI не найден: сначала выполните forge build в contracts/");
}

const source = `// Сгенерировано scripts/export-abi.mjs из сборки Foundry. Не редактировать вручную.
export const crowdfundingAbi = ${JSON.stringify(abi, null, 2)} as const;
`;

await writeFile(outputPath, source);

console.log(`ABI: ${abi.length} элементов → ${outputPath}`);
