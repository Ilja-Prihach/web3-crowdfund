import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import sharp from "sharp";
import type { Address } from "viem";

import { campaignDetails, chainEvents } from "../db/schema.ts";
import { sepoliaCrowdfunding } from "../indexer/events.ts";
import { saveDetails } from "../modules/campaigns/details.ts";
import { createMemoryMediaStorage } from "../test/app.ts";
import { createTestDatabase, resetTestDatabase } from "../test/database.ts";
import { importCover } from "./import-cover.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));

const creator = "0xAcB3eF35168E5896A9a2BC8b40cDd0628b7dc9c6" as Address;
const image = (background: string) =>
  sharp({ create: { width: 1600, height: 900, channels: 3, background } }).webp().toBuffer();

function deps() {
  const media = createMemoryMediaStorage();
  let totalRaised = 0n;
  const campaignEditState = (id: bigint) => Promise.resolve(id === 3n ? { creator, totalRaised } : null);
  return {
    db,
    media,
    contract: sepoliaCrowdfunding,
    campaignEditState,
    setTotalRaised: (value: bigint) => (totalRaised = value),
  };
}

describe("importCover", () => {
  it("пережимает обложку и ставит категорию от имени создателя из контракта", async () => {
    const context = deps();

    const row = await importCover(context, { campaignId: 3n, file: await image("#1f5c46"), category: "community" });

    assert.equal(row.category, "community");
    assert.match(row.coverKey ?? "", /^covers\/[0-9a-f]{64}\.webp$/);
    assert.equal(row.updatedBy, creator.toLowerCase());
    assert.deepEqual([...context.media.files.keys()], [row.coverKey]);
  });

  it("не стирает тексты создателя и при повторе заменяет прежний файл", async () => {
    const context = deps();
    await saveDetails(db, sepoliaCrowdfunding, 3n, { category: null, story: "История", budget: null, plan: null, risks: null }, creator);

    await importCover(context, { campaignId: 3n, file: await image("#1f5c46") });
    const row = await importCover(context, { campaignId: 3n, file: await image("#c94f35") });

    assert.equal(row.story, "История");
    assert.equal(context.media.files.size, 1);
  });

  it("отказывает для кампании, которой нет в контракте, ничего не записав", async () => {
    const context = deps();

    await assert.rejects(importCover(context, { campaignId: 99n, file: await image("#1f5c46") }), /does not exist/);

    assert.equal(context.media.files.size, 0);
    assert.equal(await db.$count(campaignDetails), 0);
  });

  it("не позволяет операторской команде обойти блокировку после первого пожертвования", async () => {
    const context = deps();
    context.setTotalRaised(1n);

    await assert.rejects(
      importCover(context, { campaignId: 3n, file: await image("#1f5c46"), category: "community" }),
      /locked after the first donation/,
    );

    assert.equal(context.media.files.size, 0);
    assert.equal(await db.$count(campaignDetails), 0);
  });

  it("не снимает операторскую блокировку после полного возврата пожертвования", async () => {
    const context = deps();
    await db.insert(chainEvents).values({
      chainId: sepoliaCrowdfunding.chainId,
      contractAddress: sepoliaCrowdfunding.address.toLowerCase(),
      blockNumber: 1n,
      blockTimestamp: new Date(),
      txHash: `0x${"2".repeat(64)}`,
      logIndex: 0,
      eventName: "DonationMade",
      campaignId: 3n,
      args: { donor: creator.toLowerCase(), amount: "1" },
    });

    await assert.rejects(
      importCover(context, { campaignId: 3n, file: await image("#1f5c46"), category: "community" }),
      /locked after the first donation/,
    );

    assert.equal(context.media.files.size, 0);
    assert.equal(await db.$count(campaignDetails), 0);
  });
});
