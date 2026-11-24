import { anvil, sepolia } from "viem/chains";

export const supportedChain = process.env.NEXT_PUBLIC_OPENFUND_DEMO === "1"
  ? { ...anvil, blockExplorers: { default: { name: "Local", url: "http://localhost" } } }
  : sepolia;

export const crowdfundingAddress = process.env.NEXT_PUBLIC_OPENFUND_DEMO === "1"
  ? "0x5FbDB2315678afecb367f032d93F642f64180aa3" as const
  : "0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A" as const;

// Публичный RPC viem по умолчанию (thirdweb) без ключа отвечает 429, поэтому запасной узел свой.
const publicSepoliaRpcUrl = "https://ethereum-sepolia-rpc.publicnode.com";

export const sepoliaRpcUrl = process.env.NEXT_PUBLIC_OPENFUND_DEMO === "1"
  ? (typeof window === "undefined" ? "http://anvil:8545" : "/demo-rpc")
  : process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL || publicSepoliaRpcUrl;

export const contractExplorerUrl = `${sepolia.blockExplorers.default.url}/address/${crowdfundingAddress}`;
