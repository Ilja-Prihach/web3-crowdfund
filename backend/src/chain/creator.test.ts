import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseEther } from "viem";

import { anvilAccounts, useAnvil } from "../test/anvil.ts";
import { deployCrowdfunding } from "../test/crowdfunding.ts";
import { createChainClient } from "./client.ts";
import { readCampaignCreator } from "./creator.ts";

const [creator, other] = anvilAccounts;
const stand = useAnvil((anvil) => deployCrowdfunding(anvil.client, creator));

describe("readCampaignCreator на Anvil", () => {
  it("читает создателя кампании №0 и следующих, а несуществующую возвращает как null", async () => {
    const campaign = stand.context;
    const chain = createChainClient(stand.anvil.url);

    // Первая кампания контракта — №0: nextCampaignId начинается с нуля.
    const first = await campaign.createCampaign(creator, { goal: parseEther("1") });
    const second = await campaign.createCampaign(other, { goal: parseEther("1") });
    assert.equal(first.campaignId, 0n);

    assert.equal(await readCampaignCreator(chain, campaign.address, 0n), creator.address);
    assert.equal(await readCampaignCreator(chain, campaign.address, second.campaignId), other.address);
    assert.equal(await readCampaignCreator(chain, campaign.address, 2n), null);
    assert.equal(await readCampaignCreator(chain, campaign.address, 2n ** 255n), null);
  });
});
