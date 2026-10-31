// Общий injected-коннектор не знает имени расширения: называем его по-человечески.
export function getWalletName(connector: { id: string; name: string }) {
  return connector.id === "injected" ? "Браузерный кошелёк" : connector.name;
}
