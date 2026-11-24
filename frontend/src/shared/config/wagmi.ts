import { cookieStorage, createConfig, createStorage, http, injected } from "wagmi";

import { sepoliaRpcUrl, supportedChain } from "./web3";
import { demoConnector } from "./demoConnector";

// Функция, а не общая константа: на сервере нужен отдельный экземпляр на каждый запрос.
export function getWagmiConfig() {
  return createConfig({
    chains: [supportedChain],
    connectors: process.env.NEXT_PUBLIC_OPENFUND_DEMO === "1"
      ? [demoConnector("Demo Creator", "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"), demoConnector("Demo Backer", "0x70997970C51812dc3A010C7d01b50e0d17dc79C8")]
      : [injected()],
    transports: {
      31337: http(sepoliaRpcUrl),
      11155111: http(sepoliaRpcUrl),
    },
    ssr: true,
    storage: createStorage({ storage: cookieStorage }),
  });
}

// Регистрирует наш конфиг в типах wagmi: хуки знают, что сеть только Sepolia.
declare module "wagmi" {
  interface Register {
    config: ReturnType<typeof getWagmiConfig>;
  }
}
