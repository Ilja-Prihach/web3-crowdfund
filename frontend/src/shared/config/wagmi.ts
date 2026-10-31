import { cookieStorage, createConfig, createStorage, http, injected } from "wagmi";

import { sepoliaRpcUrl, supportedChain } from "./web3";

// Функция, а не общая константа: на сервере нужен отдельный экземпляр на каждый запрос.
export function getWagmiConfig() {
  return createConfig({
    chains: [supportedChain],
    connectors: [injected()],
    transports: {
      [supportedChain.id]: http(sepoliaRpcUrl),
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
