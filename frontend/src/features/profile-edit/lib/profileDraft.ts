import type { ProfileInput } from "../../../entities/profile/api/profileApi.ts";
import { BackendApiError } from "../../../shared/api/backend.ts";

export function validateProfileDraft(name: string, bio: string): { input: ProfileInput; error: null } | { input: null; error: string } {
  if (name.length > 80) return { input: null, error: "Имя — не больше 80 символов" };
  if (bio.length > 1000) return { input: null, error: "Описание — не больше 1000 символов" };
  if (name.includes("\u0000") || bio.includes("\u0000")) return { input: null, error: "Уберите нулевой символ из текста" };
  return { input: { name: name.trim() || null, bio: bio.trim() || null }, error: null };
}

export function profileErrorMessage(error: unknown) {
  if (error instanceof BackendApiError) {
    if (error.status === 401) return "Вход истёк. Войдите подписью ещё раз.";
    if (error.status === 403) return "Нет разрешения сохранить профиль. Обновите страницу и проверьте вход.";
    if (error.status === 429) return "Слишком много запросов. Попробуйте через минуту.";
    if (error.status === 400) return "Проверьте имя и описание: сервер отклонил данные.";
  }
  return "Не удалось сохранить профиль. Ваш текст остался в форме — попробуйте ещё раз.";
}
