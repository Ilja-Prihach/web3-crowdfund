import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { sql } from "drizzle-orm";

import { createTestDatabase, postgresErrorCode, resetTestDatabase } from "../test/database.ts";
import { authNonces, authSessions, chainEvents, indexerCheckpoints } from "./schema.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));

const sepolia = 11_155_111;
const contract = "0x68905c4394c10c37b1d3b2f7bb3342eaff5a077a";

// Вклад 0,001 ETH в кампанию 7 — реальное событие из deployments.md.
const donation = {
  chainId: sepolia,
  contractAddress: contract,
  blockNumber: 12_050_137n,
  txHash: "0x4ff4c093eae6fc01890a223d30559371b06aa80b8b86f4e85180df8f3d28e3b5",
  logIndex: 0,
  eventName: "DonationMade",
  campaignId: 7n,
  args: { donor: "0x012e40523eaca6bed2e8205a05ec7e6281db5ef5", amount: "1000000000000000" },
};

// Ожидает отказ базы с конкретным кодом ошибки PostgreSQL.
async function rejectsWith(code: string, query: Promise<unknown>) {
  await assert.rejects(query, (error) => postgresErrorCode(error) === code);
}

describe("схема indexer", () => {
  it("миграции создают все таблицы на пустой базе", async () => {
    const result = await db.execute<{ table_name: string }>(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    assert.deepEqual(
      result.rows.map((row) => row.table_name),
      ["auth_nonces", "auth_sessions", "chain_events", "indexer_checkpoints"],
    );
  });

  it("не записывает одно событие дважды", async () => {
    await db.insert(chainEvents).values(donation);
    await rejectsWith("23505", db.insert(chainEvents).values({ ...donation, blockNumber: 1n }));
  });

  it("молча пропускает повтор при ON CONFLICT DO NOTHING", async () => {
    await db.insert(chainEvents).values(donation).onConflictDoNothing();
    await db.insert(chainEvents).values(donation).onConflictDoNothing();

    const rows = await db.select().from(chainEvents);
    assert.equal(rows.length, 1);
  });

  it("хранит uint256 без потери точности", async () => {
    const maxUint256 = 2n ** 256n - 1n;
    await db.insert(chainEvents).values({ ...donation, campaignId: maxUint256 });

    const [row] = await db.select().from(chainEvents);
    assert.equal(row?.campaignId, maxUint256);
  });

  it("отклоняет адрес не в нижнем регистре, неизвестное событие и нулевой chain ID", async () => {
    await rejectsWith("23514", db.insert(chainEvents).values({ ...donation, contractAddress: contract.toUpperCase() }));
    await rejectsWith("23514", db.insert(chainEvents).values({ ...donation, eventName: "Transfer" }));
    await rejectsWith("23514", db.insert(chainEvents).values({ ...donation, chainId: 0 }));
  });

  it("держит отдельный checkpoint для каждой пары сети и контракта", async () => {
    const otherContract = "0x480ec361ebdd78465831eb555d3efcf650d2a217";
    await db.insert(indexerCheckpoints).values([
      { chainId: sepolia, contractAddress: contract, lastBlock: 12_050_000n },
      { chainId: sepolia, contractAddress: otherContract, lastBlock: 12_000_000n },
      { chainId: 31_337, contractAddress: contract, lastBlock: 5n },
    ]);
    await rejectsWith(
      "23505",
      db.insert(indexerCheckpoints).values({ chainId: sepolia, contractAddress: contract, lastBlock: 1n }),
    );

    const rows = await db.select().from(indexerCheckpoints);
    assert.equal(rows.length, 3);
  });
});

describe("схема входа", () => {
  const nonce = "a".repeat(64);
  const inTenMinutes = () => new Date(Date.now() + 10 * 60_000);
  const session = {
    idHash: "b".repeat(64),
    address: "0x012e40523eaca6bed2e8205a05ec7e6281db5ef5",
    expiresAt: new Date(Date.now() + 7 * 24 * 3_600_000),
  };

  it("не выдаёт один nonce дважды", async () => {
    await db.insert(authNonces).values({ nonce, expiresAt: inTenMinutes() });
    await rejectsWith("23505", db.insert(authNonces).values({ nonce, expiresAt: inTenMinutes() }));
  });

  it("принимает nonce только как 32 байта в hex нижнего регистра", async () => {
    for (const bad of ["a".repeat(63), "A".repeat(64), "g".repeat(64), "0x" + "a".repeat(62)]) {
      await rejectsWith("23514", db.insert(authNonces).values({ nonce: bad, expiresAt: inTenMinutes() }));
    }
  });

  it("хранит сессию с хэшем идентификатора и сроком позже создания", async () => {
    await db.insert(authSessions).values(session);

    const [row] = await db.select().from(authSessions);
    assert.equal(row?.idHash, session.idHash);
    assert.ok(row && row.expiresAt > row.createdAt);
    await rejectsWith("23505", db.insert(authSessions).values(session));
  });

  it("отклоняет хэш не того формата, адрес не в нижнем регистре и срок раньше создания", async () => {
    await rejectsWith("23514", db.insert(authSessions).values({ ...session, idHash: "b".repeat(32) }));
    await rejectsWith("23514", db.insert(authSessions).values({ ...session, address: session.address.toUpperCase() }));
    await rejectsWith("23514", db.insert(authSessions).values({ ...session, expiresAt: new Date(Date.now() - 1_000) }));
  });
});
