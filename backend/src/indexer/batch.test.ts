import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { createPublicClient, custom, http, parseEther } from "viem";

import { createChainClient } from "../chain/client.ts";
import { crowdfunding } from "../chain/contract.ts";
import { campaignMetadata, campaigns, chainEvents, contributions, indexerCheckpoints } from "../db/schema.ts";
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
  const deployBlock = await client.getBlockNumber({ cacheTime: 0 });
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

// Сверяет проекции с контрактом поле за полем: так проверяется, что indexer пересказал события верно.
async function assertProjectionMatchesContract() {
  const { client } = stand.anvil;
  const { address } = stand.context.contract;
  const onChain = await client.readContract({ address, abi: crowdfunding.abi, functionName: "getCampaigns", args: [0n, 20n] });
  const rows = (await db.select().from(campaigns)).toSorted((left, right) => Number(left.campaignId - right.campaignId));
  const titles = new Map((await db.select().from(campaignMetadata)).map((row) => [row.campaignId, row.title]));

  assert.equal(rows.length, onChain.length, "число кампаний");
  for (const [index, { id, campaign }] of onChain.entries()) {
    const row = rows[index];
    assert.deepEqual(
      row && {
        id: row.campaignId,
        creator: row.creator,
        title: titles.get(row.campaignId),
        goal: row.goal,
        deadline: row.deadline,
        totalRaised: row.totalRaised,
        cancelled: row.cancelled,
        fundsWithdrawn: row.fundsWithdrawn,
      },
      {
        id,
        creator: campaign.creator.toLowerCase(),
        title: campaign.title,
        goal: campaign.goal,
        deadline: campaign.deadline,
        totalRaised: campaign.totalRaised,
        cancelled: campaign.cancelled,
        fundsWithdrawn: campaign.fundsWithdrawn,
      },
      `кампания ${id}`,
    );
  }
  for (const row of await db.select().from(contributions)) {
    const amount = await client.readContract({
      address,
      abi: crowdfunding.abi,
      functionName: "contributions",
      args: [row.campaignId, row.donor as `0x${string}`],
    });
    assert.equal(row.amount, amount, `вклад ${row.donor} в кампанию ${row.campaignId}`);
  }
}

// Все виды событий V2: смена срока, вклады, отмена с возвратом, вывод и возврат после провала.
async function createEveryEvent() {
  const { campaign } = stand.context;
  const cancelled = await campaign.createCampaign(creator, { goal: parseEther("1"), days: 7, title: "Отменённая" });
  await campaign.updateDeadline(creator, cancelled.campaignId, 10);
  await campaign.donate(donor, cancelled.campaignId, parseEther("0.4"));
  await campaign.cancel(creator, cancelled.campaignId);
  await campaign.refund(donor, cancelled.campaignId);
  const funded = await campaign.createCampaign(creator, { goal: parseEther("0.5"), mode: "open", title: "Собранная" });
  await campaign.donate(donor, funded.campaignId, parseEther("0.2"));
  await campaign.donate(creator, funded.campaignId, parseEther("0.3"));
  await campaign.withdraw(creator, funded.campaignId);
  const failed = await campaign.createCampaign(creator, { goal: parseEther("1"), days: 1, title: "Проваленная" });
  await campaign.donate(donor, failed.campaignId, parseEther("0.1"));
  await campaign.donate(creator, failed.campaignId, parseEther("0.2"));
  await campaign.passDays(2);
  await campaign.refund(donor, failed.campaignId);
}

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

  it("строит проекции из всех видов событий так, что они совпадают с контрактом", async () => {
    await createEveryEvent();
    await finalize();

    await indexUntilIdle(deps({ batchSize: 7n }));

    await assertProjectionMatchesContract();
    assert.equal(await db.$count(campaignMetadata), 3);
  });

  it("повторный проход тех же блоков не создаёт дублей и не удваивает суммы", async () => {
    await createEveryEvent();
    await finalize();
    await indexUntilIdle(deps());

    // Как после потери checkpoint: indexer начинает с блока deploy заново.
    await db.delete(indexerCheckpoints);
    await indexUntilIdle(deps());

    assert.equal(await db.$count(chainEvents), 13);
    await assertProjectionMatchesContract();
  });

  it("ошибка проекции откатывает всю пачку: ни событий, ни метаданных, ни checkpoint", async () => {
    const { campaign, contract } = stand.context;
    await campaign.createCampaign(creator, { goal: parseEther("1") });
    await finalize();
    // Чужая строка в проекции: CampaignCreated для кампании 0 упрётся в первичный ключ.
    const key = { chainId: contract.chainId, contractAddress: contract.address.toLowerCase(), campaignId: 0n };
    await db.insert(campaignMetadata).values({ ...key, fundingMode: "open_ended", title: "x", description: "x" });
    await db.insert(campaigns).values({
      ...key,
      creator: donor.address.toLowerCase(),
      goal: 1n,
      deadline: 0n,
      totalRaised: 0n,
      cancelled: false,
      fundsWithdrawn: false,
      createdBlock: 1n,
      updatedBlock: 1n,
    });

    await assert.rejects(indexNextBatch(deps()));

    assert.equal(await db.$count(chainEvents), 0);
    assert.equal(await readCheckpoint(db, contract), null);
  });

  it("два indexer над одними блоками одновременно не удваивают суммы", async () => {
    await createEveryEvent();
    await finalize();

    await Promise.all([indexUntilIdle(deps({ batchSize: 5n })), indexUntilIdle(deps({ batchSize: 3n }))]);

    assert.equal(await db.$count(chainEvents), 13);
    await assertProjectionMatchesContract();
  });

  it("ошибка чтения не двигает checkpoint, а следующий запуск продолжает с него", async () => {
    const { campaign, contract } = stand.context;
    await campaign.createCampaign(creator, { goal: parseEther("1") });
    await finalize();
    // Пачка из одного блока: после неё до finalized остаётся непрочитанный блок с событием.
    await indexNextBatch(deps({ batchSize: 1n }));
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
    const otherContract = { ...contract, address: other.address, deployBlock: await stand.anvil.client.getBlockNumber({ cacheTime: 0 }) };
    await finalize();

    await indexUntilIdle(deps());
    assert.equal(await readCheckpoint(db, otherContract), null, "второй контракт ещё не читали");
    await indexUntilIdle(deps({ contract: otherContract }));
    assert.ok((await readCheckpoint(db, otherContract)) !== null);
  });
});
