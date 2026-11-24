import { getAddress } from "viem";
import { anvil, sepolia } from "viem/chains";

import { crowdfundingAbi } from "./crowdfundingAbi.ts";

// Канонический источник адреса и блока deploy — docs/deployments.md; совпадение проверяет тест.
const demo = process.env.OPENFUND_DEMO === "1";
export const crowdfunding = {
  chain: demo ? anvil : sepolia,
  address: getAddress(demo ? "0x5FbDB2315678afecb367f032d93F642f64180aa3" : "0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A"),
  deployBlock: demo ? 1n : 12_014_545n,
  abi: crowdfundingAbi,
} as const;

// Так адрес хранится в базе: CHECK в chain_events требует нижний регистр.
export const crowdfundingAddressInDatabase = crowdfunding.address.toLowerCase();
