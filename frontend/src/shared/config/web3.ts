import { sepolia } from "viem/chains";

export const supportedChain = sepolia;

export const crowdfundingAddress = "0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A" as const;

// Пустая переменная означает публичный RPC по умолчанию из viem.
export const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || undefined;

export const contractExplorerUrl = `${sepolia.blockExplorers.default.url}/address/${crowdfundingAddress}`;
