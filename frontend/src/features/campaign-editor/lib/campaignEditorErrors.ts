import { BackendApiError } from "../../../shared/api/backend.ts";

const messages: Record<string, string> = {
  CAMPAIGN_DETAILS_LOCKED: "Редактирование закрыто: кампания уже получила первое пожертвование.",
  NOT_CAMPAIGN_CREATOR: "Изменять эту страницу может только создатель кампании.",
  CAMPAIGN_NOT_FOUND: "Кампания не найдена в контракте.",
  COVER_REQUIRED: "Выберите файл обложки.",
  COVER_TOO_LARGE: "Файл должен быть не больше 5 МБ.",
  UNSUPPORTED_IMAGE: "Backend не распознал JPEG, PNG или WebP.",
  CHAIN_BUSY: "Проверка кампании временно перегружена. Повторите через минуту.",
  CHAIN_UNAVAILABLE: "Не удалось проверить кампанию в Sepolia. Попробуйте позже.",
  RATE_LIMITED: "Слишком много попыток. Подождите минуту.",
};

export function getCampaignEditorErrorMessage(error: unknown) {
  if (!(error instanceof BackendApiError)) return "Не удалось сохранить изменения. Попробуйте ещё раз.";
  if (error.status === 401) return "Сессия входа закончилась. Войдите подписью ещё раз.";
  if (error.status === 0) return "Backend недоступен. Проверьте соединение и попробуйте ещё раз.";
  return messages[error.code] ?? "Backend не принял изменения. Попробуйте ещё раз.";
}
