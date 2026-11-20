import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

// Хранилище файлов медиа. Маршруты знают только этот интерфейс: локальную папку при деплое
// заменит S3-совместимое хранилище без изменения их кода.
export interface MediaStorage {
  put(key: string, data: Buffer): Promise<void>;
  // null — файла нет.
  get(key: string): Promise<Buffer | null>;
  // Удаление отсутствующего файла — не ошибка: повтор после сбоя должен проходить.
  delete(key: string): Promise<void>;
}

// Ключ — папка и sha256 файла WebP. Всё прочее, включая ../ и абсолютные пути, отклоняется до обращения к диску.
export const mediaKeyPattern = /^[a-z]+\/[0-9a-f]{64}\.webp$/;

function assertMediaKey(key: string) {
  if (!mediaKeyPattern.test(key)) throw new Error(`Invalid media key "${key}"`);
}

export function createLocalMediaStorage(root: string): MediaStorage {
  const pathOf = (key: string) => {
    assertMediaKey(key);
    return join(root, key);
  };

  return {
    async put(key, data) {
      const path = pathOf(key);
      await mkdir(dirname(path), { recursive: true });
      // Запись во временный файл и rename: читатель никогда не увидит наполовину записанную картинку.
      const temporary = `${path}.${process.pid}.${Date.now()}.tmp`;
      await writeFile(temporary, data);
      await rename(temporary, path);
    },
    async get(key) {
      try {
        return await readFile(pathOf(key));
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
        throw error;
      }
    },
    async delete(key) {
      await rm(pathOf(key), { force: true });
    },
  };
}
