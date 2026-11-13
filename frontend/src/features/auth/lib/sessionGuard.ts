import { type Address, isAddressEqual } from "viem";

type SessionGuardInput = {
  sessionAddress: Address | undefined;
  walletStatus: "connected" | "connecting" | "reconnecting" | "disconnected";
  walletAddress: Address | undefined;
};

// Сессия принадлежит одному адресу. Если кошелёк подключён к другому, сессию нужно завершить: иначе сайт считал бы
// вошедшим не того, кто сейчас подписывает транзакции. Пока кошелёк подключается или переподключается после загрузки
// страницы, адреса ещё нет — это не смена аккаунта, и сессию трогать нельзя.
export function shouldEndSession({ sessionAddress, walletStatus, walletAddress }: SessionGuardInput) {
  if (!sessionAddress || walletStatus !== "connected" || !walletAddress) return false;
  return !isAddressEqual(sessionAddress, walletAddress);
}
