import { getAddress } from "viem";
import { sepolia } from "viem/chains";

import { crowdfundingAbi } from "./crowdfundingAbi.ts";

// Канонический источник адреса и блока deploy — docs/deployments.md; совпадение проверяет тест.
export const crowdfunding = {
  chain: sepolia,
  address: getAddress("0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A"),
  deployBlock: 12_014_545n,
  abi: crowdfundingAbi,
} as const;

// Так адрес хранится в базе: CHECK в chain_events требует нижний регистр.
export const crowdfundingAddressInDatabase = crowdfunding.address.toLowerCase();
