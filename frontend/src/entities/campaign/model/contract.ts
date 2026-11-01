import { crowdfundingAbi } from "@/shared/config/crowdfundingAbi";
import { crowdfundingAddress, supportedChain } from "@/shared/config/web3";

// Чтение всегда идёт в Sepolia через наш RPC, независимо от сети и наличия кошелька.
export const crowdfundingContract = {
  address: crowdfundingAddress,
  abi: crowdfundingAbi,
  chainId: supportedChain.id,
} as const;
