import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseEther } from "viem";

import { crowdfunding } from "../chain/contract.ts";
import { crowdfundingEventNames } from "../db/schema.ts";
import { anvilAccounts, useAnvil } from "./anvil.ts";
import { deployCrowdfunding } from "./crowdfunding.ts";

const [creator, donor] = anvilAccounts;
const stand = useAnvil((anvil) => deployCrowdfunding(anvil.client, creator));

describe("помощник Crowdfunding на Anvil", () => {
  it("разворачивает V2: код на адресе есть, кампаний ещё нет", async () => {
    const { client } = stand.anvil;
    const { address } = stand.context;

    assert.ok(await client.getCode({ address }));
    assert.equal(await client.readContract({ address, abi: crowdfunding.abi, functionName: "nextCampaignId" }), 0n);
  });

  it("создаёт все шесть событий V2, которые понимает backend-ABI", async () => {
    const campaign = stand.context;

    // Срочная кампания: смена срока (до вкладов), вклад, отмена создателем, возврат вклада.
    const fixed = await campaign.createCampaign(creator, { goal: parseEther("1"), days: 7 });
    const updated = await campaign.updateDeadline(creator, fixed.campaignId, 10);
    const donated = await campaign.donate(donor, fixed.campaignId, parseEther("0.4"));
    const cancelled = await campaign.cancel(creator, fixed.campaignId);
    const refunded = await campaign.refund(donor, fixed.campaignId);
    // Бессрочная кампания: вклад достигает цели, создатель выводит средства.
    const open = await campaign.createCampaign(creator, { goal: parseEther("0.5"), mode: "open" });
    await campaign.donate(donor, open.campaignId, parseEther("0.5"));
    const withdrawn = await campaign.withdraw(creator, open.campaignId);

    const names = [fixed.events, updated, donated, cancelled, refunded, withdrawn].flat().map((event) => event.eventName);
    assert.deepEqual([...new Set(names)].sort(), [...crowdfundingEventNames].sort());

    const donation = donated.find((event) => event.eventName === "DonationMade");
    assert.equal(donation?.args.donor, donor.address);
    assert.equal(donation?.args.amount, parseEther("0.4"));
  });

  it("перематывает время: срочная кампания без цели после срока становится failed и отдаёт вклад", async () => {
    const campaign = stand.context;
    const { campaignId } = await campaign.createCampaign(creator, { goal: parseEther("1"), days: 3 });
    await campaign.donate(donor, campaignId, parseEther("0.2"));
    assert.equal(await campaign.status(campaignId), 0, "Active");

    await campaign.passDays(4);

    assert.equal(await campaign.status(campaignId), 2, "Failed");
    const refund = await campaign.refund(donor, campaignId);
    assert.equal(refund[0]?.eventName, "RefundClaimed");
  });

  it("каждый тест видит только что развёрнутый контракт: кампании прошлых тестов откачены", async () => {
    const { client } = stand.anvil;
    const { address } = stand.context;

    assert.equal(await client.readContract({ address, abi: crowdfunding.abi, functionName: "nextCampaignId" }), 0n);
  });
});
