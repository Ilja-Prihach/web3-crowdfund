import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseEther } from "viem";

import { anvilAccounts, useAnvil } from "../test/anvil.ts";
import { deployCrowdfunding } from "../test/crowdfunding.ts";
import { createChainClient } from "./client.ts";
import { readCampaignEditState } from "./creator.ts";

const [creator, other] = anvilAccounts;
const stand = useAnvil((anvil) => deployCrowdfunding(anvil.client, creator));

describe("readCampaignEditState на Anvil", () => {
  it("читает создателя и сумму пожертвований, а несуществующую кампанию возвращает как null", async () => {
    const campaign = stand.context;
    const chain = createChainClient(stand.anvil.url);

    // Первая кампания контракта — №0: nextCampaignId начинается с нуля.
    const first = await campaign.createCampaign(creator, { goal: parseEther("1") });
    const second = await campaign.createCampaign(other, { goal: parseEther("1") });
    assert.equal(first.campaignId, 0n);

    assert.deepEqual(await readCampaignEditState(chain, campaign.address, 0n), {
      creator: creator.address,
      totalRaised: 0n,
    });
    await campaign.donate(other, 0n, parseEther("0.25"));
    assert.deepEqual(await readCampaignEditState(chain, campaign.address, 0n), {
      creator: creator.address,
      totalRaised: parseEther("0.25"),
    });
    assert.deepEqual(await readCampaignEditState(chain, campaign.address, second.campaignId), {
      creator: other.address,
      totalRaised: 0n,
    });
    assert.equal(await readCampaignEditState(chain, campaign.address, 2n), null);
    assert.equal(await readCampaignEditState(chain, campaign.address, 2n ** 255n), null);
  });
});
