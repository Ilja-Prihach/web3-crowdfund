import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { createPublicClient, custom, http, parseEther } from "viem";

import { createChainClient } from "../chain/client.ts";
import { crowdfunding } from "../chain/contract.ts";
import { chainEvents, indexerCheckpoints } from "../db/schema.ts";
import { anvilAccounts, useAnvil } from "../test/anvil.ts";
import { deployCrowdfunding } from "../test/crowdfunding.ts";
import { createTestDatabase, resetTestDatabase } from "../test/database.ts";
import { type IndexerDeps, indexNextBatch, readCheckpoint, saveBatch } from "./batch.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));

const [creator, donor] = anvilAccounts;
// Anvil считает finalized как «последний блок минус 64» — две эпохи по 32 слота.
const finalityDepth = 64;

const stand = useAnvil(async ({ client }) => {
  const campaign = await deployCrowdfunding(client, creator);
  const deployBlock = await client.getBlockNumber();
  return { campaign, contract: { chainId: await client.getChainId(), address: campaign.address, deployBlock } };
});

const deps = (overrides: Partial<IndexerDeps> = {}): IndexerDeps => ({
  db,
  chain: createChainClient(stand.anvil.url),
  contract: stand.context.contract,
  batchSize: 1_000n,
  ...overrides,
});

const finalize = () => stand.anvil.client.mine({ blocks: finalityDepth });

// Прогоняет пачки, пока indexer не догонит finalized.
async function indexUntilIdle(indexerDeps: IndexerDeps) {
  const batches = [];
  for (;;) {
    const result = await indexNextBatch(indexerDeps);
    if (result.status === "idle") return batches;
    batches.push(result);
  }
}

describe("indexNextBatch", () => {
  it("не читает события, пока их блок не финализирован", async () => {
    await stand.context.campaign.createCampaign(creator, { goal: parseEther("1") });

    await indexUntilIdle(deps());
    assert.equal(await db.$count(chainEvents), 0, "до финализации");

    await finalize();
    await indexUntilIdle(deps());
    assert.equal(await db.$count(chainEvents), 1, "после финализации");
  });

  it("идёт пачками не больше batchSize блоков, без пропусков и наложений", async () => {
    const { campaign, contract } = stand.context;
    for (let index = 0; index < 5; index++) await campaign.createCampaign(creator, { goal: parseEther("1") });
    await finalize();

    const batches = await indexUntilIdle(deps({ batchSize: 3n }));

    assert.equal(batches[0]?.fromBlock, contract.deployBlock);
    for (const [index, batch] of batches.entries()) {
      assert.ok(batch.toBlock - batch.fromBlock + 1n <= 3n, "размер пачки");
      if (index > 0) assert.equal(batch.fromBlock, (batches[index - 1]?.toBlock ?? 0n) + 1n, "следующая пачка сразу за предыдущей");
    }
    assert.equal(batches.at(-1)?.toBlock, batches.at(-1)?.finalized, "дошли ровно до finalized");
    assert.equal(await db.$count(chainEvents), 5);
  });

  it("повторный проход тех же блоков не создаёт дублей", async () => {
    const { campaign } = stand.context;
    const { campaignId } = await campaign.createCampaign(creator, { goal: parseEther("1") });
    await campaign.donate(donor, campaignId, parseEther("0.1"));
    await finalize();
    await indexUntilIdle(deps());

    // Как после потери checkpoint: indexer начинает с блока deploy заново.
    await db.delete(indexerCheckpoints);
    await indexUntilIdle(deps());

    assert.equal(await db.$count(chainEvents), 2);
  });

  it("ошибка чтения не двигает checkpoint, а следующий запуск продолжает с него", async () => {
    const { campaign, contract } = stand.context;
    await campaign.createCampaign(creator, { goal: parseEther("1") });
    await finalize();
    await indexNextBatch(deps({ batchSize: 2n }));
    const before = await readCheckpoint(db, contract);

    // Узел, который отвечает на всё, кроме eth_getLogs, — как 1rpc с -32029.
    const node = http(stand.anvil.url)({ chain: crowdfunding.chain });
    const flaky = createPublicClient({
      chain: crowdfunding.chain,
      transport: custom(
        {
          request: (args: { method: string; params?: unknown }) =>
            args.method === "eth_getLogs"
              ? Promise.reject(Object.assign(new Error("Too Many Requests"), { code: -32029 }))
              : node.request(args),
        },
        { retryCount: 0 },
      ),
    });

    await assert.rejects(indexNextBatch(deps({ chain: flaky, batchSize: 2n })));
    assert.equal(await readCheckpoint(db, contract), before, "checkpoint на месте");

    const resumed = await indexNextBatch(deps({ batchSize: 2n }));
    assert.equal(resumed.status === "indexed" && resumed.fromBlock, (before ?? 0n) + 1n, "продолжение с checkpoint");
  });

  it("checkpoint не идёт назад: опоздавшая пачка второго indexer его не откатывает", async () => {
    const { contract } = stand.context;

    await saveBatch(db, contract, [], 20n);
    await saveBatch(db, contract, [], 15n);

    assert.equal(await readCheckpoint(db, contract), 20n);
  });

  it("хранит отдельный checkpoint для каждого контракта", async () => {
    const { contract } = stand.context;
    const other = await deployCrowdfunding(stand.anvil.client, creator);
    const otherContract = { ...contract, address: other.address, deployBlock: await stand.anvil.client.getBlockNumber() };
    await finalize();

    await indexUntilIdle(deps());
    assert.equal(await readCheckpoint(db, otherContract), null, "второй контракт ещё не читали");
    await indexUntilIdle(deps({ contract: otherContract }));
    assert.ok((await readCheckpoint(db, otherContract)) !== null);
  });
});
