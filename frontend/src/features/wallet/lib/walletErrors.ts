type ErrorLike = { name?: unknown; code?: unknown; cause?: unknown };

// wagmi и viem заворачивают исходную ошибку кошелька в несколько слоёв: идём вниз по cause.
function findInCauseChain(error: unknown, matches: (candidate: ErrorLike) => boolean) {
  let current: unknown = error;

  for (let depth = 0; current && depth < 10; depth += 1) {
    const candidate = current as ErrorLike;
    if (matches(candidate)) return true;
    current = candidate.cause;
  }

  return false;
}

const hasCode = (code: number) => (candidate: ErrorLike) => candidate.code === code;
const hasName =
  (...names: string[]) =>
  (candidate: ErrorLike) =>
    typeof candidate.name === "string" && names.includes(candidate.name);

export function getWalletErrorMessage(error: unknown) {
  if (findInCauseChain(error, hasCode(4001))) {
    return "Вы отменили запрос в кошельке. Ничего не отправлено.";
  }

  if (findInCauseChain(error, hasName("ProviderNotFoundError"))) {
    return "Кошелёк не найден. Установите расширение, например MetaMask, и обновите страницу.";
  }

  if (findInCauseChain(error, hasCode(-32002))) {
    return "Кошелёк уже ждёт вашего ответа. Откройте его окно.";
  }

  if (findInCauseChain(error, hasName("SwitchChainNotSupportedError", "SwitchChainError"))) {
    return "Кошелёк не смог переключиться на Sepolia. Выберите сеть вручную в кошельке.";
  }

  return "Не удалось связаться с кошельком или сетью. Попробуйте ещё раз.";
}
