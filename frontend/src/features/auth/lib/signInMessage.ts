import { type Address, getAddress } from "viem";
import { createSiweMessage } from "viem/siwe";

import { supportedChain } from "../../../shared/config/web3.ts";

// Срок nonce на backend: позже подпись уже не примут.
export const nonceLifetimeMs = 10 * 60_000;

type SignInMessageInput = { address: Address; nonce: string; origin: string; issuedAt: Date };

// Сообщение EIP-4361, которое кошелёк покажет пользователю. Домен и URI — текущий сайт:
// backend сверяет их со своим APP_ORIGIN, и подпись, выманенная другим сайтом, не подойдёт.
export function buildSignInMessage({ address, nonce, origin, issuedAt }: SignInMessageInput) {
  return createSiweMessage({
    // EIP-4361 требует адрес с контрольной суммой EIP-55, а кошельки часто отдают его строчными буквами.
    address: getAddress(address),
    chainId: supportedChain.id,
    domain: new URL(origin).host,
    uri: origin,
    nonce,
    version: "1",
    issuedAt,
    // Стандарт допускает в statement только ASCII, поэтому текст английский; по-русски его объясняет интерфейс.
    statement: "Sign in to OpenFund. This request does not send a transaction and costs no gas.",
  });
}
