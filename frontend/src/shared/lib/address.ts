// «0xD3a9…71bC»: человек сверяет с кошельком начало и конец адреса.
// Регистр не меняем — это контрольная сумма EIP-55.
export function shortenAddress(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}
