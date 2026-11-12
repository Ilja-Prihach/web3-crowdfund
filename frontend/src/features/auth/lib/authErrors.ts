import { findInCauseChain, getWalletErrorMessage } from "../../wallet/lib/walletErrors.ts";
import { AuthApiError } from "../api/authApi.ts";
import { nonceLifetimeMs } from "./signInMessage.ts";

const isRejectedInWallet = (error: unknown) => Boolean(findInCauseChain(error, (candidate) => candidate.code === 4001));

// Сообщение для пользователя по ошибке входа. nonceAgeMs — сколько прошло с выдачи nonce: backend на истёкший
// nonce отвечает тем же SIWE_INVALID, что и на любую другую ошибку, и отличить случай может только frontend.
export function getSignInErrorMessage(error: unknown, nonceAgeMs = 0) {
  if (isRejectedInWallet(error)) return "Вы отменили подпись в кошельке. Вход не выполнен.";

  if (error instanceof AuthApiError) {
    if (error.code === "SIWE_INVALID" && nonceAgeMs >= nonceLifetimeMs) {
      return "Время на подпись истекло: прошло больше 10 минут. Нажмите «Войти» ещё раз.";
    }
    switch (error.code) {
      case "SIWE_INVALID":
        return "Сервер не принял подпись. Попробуйте войти ещё раз.";
      case "RATE_LIMITED":
        return "Слишком много попыток входа. Подождите минуту и попробуйте снова.";
      case "AUTH_BUSY":
        return "Сервер сейчас перегружен попытками входа. Попробуйте через минуту.";
      case "ORIGIN_FORBIDDEN":
        return "Вход возможен только с сайта OpenFund.";
      default:
        return "Сервер OpenFund недоступен. Попробуйте позже.";
    }
  }

  return getWalletErrorMessage(error);
}
