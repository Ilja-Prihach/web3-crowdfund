import { sepolia } from "viem/chains";

export const supportedChain = sepolia;

export const crowdfundingAddress = "0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A" as const;

// Публичный RPC viem по умолчанию (thirdweb) без ключа отвечает 429, поэтому запасной узел свой.
const publicSepoliaRpcUrl = "https://ethereum-sepolia-rpc.publicnode.com";

export const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || publicSepoliaRpcUrl;

export const contractExplorerUrl = `${sepolia.blockExplorers.default.url}/address/${crowdfundingAddress}`;
