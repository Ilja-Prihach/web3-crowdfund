import { readFile } from "node:fs/promises";

import pg from "pg";

import { createChainClient } from "/app/src/chain/client.ts";
import { crowdfunding } from "/app/src/chain/contract.ts";
import { processCover } from "/app/src/media/cover.ts";
import { createLocalMediaStorage } from "/app/src/media/storage.ts";

const covers = [
  ["Городская мастерская", "workshop.webp"],
  ["Книги для школьной библиотеки", "library.webp"],
  ["Мобильный сад", "garden.webp"],
  ["Музыкальная студия", "studio.webp"],
  ["Общественный кинопоказ", "cinema.webp"],
];

const chain = createChainClient(process.env.SEPOLIA_RPC_URL);
const media = createLocalMediaStorage(process.env.MEDIA_DIR);
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  const campaigns = await chain.readContract({
    address: crowdfunding.address,
    abi: crowdfunding.abi,
    functionName: "getCampaigns",
    args: [0n, BigInt(covers.length)],
  });

  for (const [index, [title, filename]] of covers.entries()) {
    const campaign = campaigns[index]?.campaign;
    if (!campaign || campaign.title !== title) {
      throw new Error(`Unexpected demo campaign at index ${index}`);
    }

    const existing = await client.query(
      "select 1 from campaign_details where chain_id = $1 and contract_address = $2 and campaign_id = $3",
      [crowdfunding.chain.id, crowdfunding.address.toLowerCase(), index],
    );
    if (existing.rowCount) continue;

    const cover = await processCover(await readFile(`/demo-covers/${filename}`));
    await media.put(cover.key, cover.data);
    await client.query(
      `insert into campaign_details (chain_id, contract_address, campaign_id, cover_key, updated_by)
       values ($1, $2, $3, $4, $5) on conflict do nothing`,
      [crowdfunding.chain.id, crowdfunding.address.toLowerCase(), index, cover.key, campaign.creator.toLowerCase()],
    );
  }
} finally {
  await client.end();
}
