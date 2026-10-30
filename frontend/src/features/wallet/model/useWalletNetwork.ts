import { useConnection } from "wagmi";

import { supportedChain } from "@/shared/config/web3";

// «Неверная сеть» вычисляется из фактов, а не хранится: этим же хуком PR 7 заблокирует действия.
export function useWalletNetwork() {
  const connection = useConnection();
  // Адрес есть и во время «reconnecting», когда сессия восстановлена из cookie.
  const isConnected = Boolean(connection.address);

  return {
    isConnected,
    isWrongNetwork: isConnected && connection.chainId !== supportedChain.id,
  };
}
