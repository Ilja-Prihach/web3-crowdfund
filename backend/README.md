# Backend

Статус: каркас и подключение к PostgreSQL. Есть сервер Fastify с маршрутами `GET /health` и `GET /ready`, проверка конфигурации при старте, плавная остановка, единый формат ошибок, пул PostgreSQL с Drizzle, ESLint с проверкой типов и тесты на настоящей БД. Таблицы, indexer, вход подписью и API каталога появятся следующими шагами этапа 5, см. [`docs/roadmap.md`](../docs/roadmap.md#этап-5-backend-и-blockchain-indexer).

## Стек

- Node.js 24 запускает TypeScript напрямую, вырезая типы (type stripping), без сборщика;
- Fastify — HTTP-сервер;
- PostgreSQL 18.4 в Docker Compose, драйвер `pg`, Drizzle ORM и `drizzle-kit` для миграций;
- проверка типов — `tsc`, линтер — ESLint с `typescript-eslint`, тесты — встроенный `node:test`.

Почему выбран этот стек, записано в [`docs/DECISIONS.md`](../docs/DECISIONS.md#backend-uses-fastify-on-node).

## Локальный запуск

Нужен Docker. Из корня репозитория поднимается PostgreSQL:

```sh
docker compose up -d --wait
```

Порт открыт только на `127.0.0.1:5433`, пароль учебный. При первом запуске тома создаются две БД: `openfund` для разработки и `openfund_test` для тестов. Остановить — `docker compose stop`, удалить вместе с данными — `docker compose down -v`.

Затем из каталога `backend/`:

```sh
nvm use
npm ci
cp .env.example .env
npm run dev
```

Сервер слушает `http://127.0.0.1:4000` и перезапускается при сохранении файла; `.env` Node.js читает сам через `--env-file-if-exists`. Проверка: `curl http://127.0.0.1:4000/health` отвечает `{"status":"ok"}`, а `curl http://127.0.0.1:4000/ready` — `{"status":"ready"}`, если база доступна, и `503`, если нет.

## Переменные окружения

| Переменная | По умолчанию | Назначение |
| --- | --- | --- |
| `PORT` | `4000` | порт HTTP-сервера, целое число 1–65535 |
| `HOST` | `127.0.0.1` | адрес прослушивания; `0.0.0.0` открывает сервер всей сети и нужен только в контейнере |
| `LOG_LEVEL` | `info` | `fatal`, `error`, `warn`, `info`, `debug` или `trace` |
| `DATABASE_URL` | нет, обязательна | строка подключения `postgres://`, пример — в `.env.example` |
| `TEST_DATABASE_URL` | `postgres://openfund:openfund@127.0.0.1:5433/openfund_test` | БД для `npm test` |

Неверное значение останавливает процесс при старте с понятной ошибкой. Строка подключения в текст ошибки не попадает: в ней пароль.

## Миграции

Схема таблиц описывается в `src/db/schema.ts`. `npm run db:generate` превращает её изменения в SQL-файл в `drizzle/`, а `npm run db:migrate` применяет новые миграции к `DATABASE_URL`. Миграции коммитятся; база меняется только ими. Таблиц пока нет.

Install-скрипты `esbuild`, которые тянет `drizzle-kit`, запрещены в `allowScripts` файла `package.json`: генерация миграций работает без них.

## Ограничения type stripping

Node.js только вырезает типы, поэтому:

- в относительных импортах пишется расширение: `./app.ts`;
- синтаксис, который нельзя просто стереть (`enum`, `namespace`, параметры-свойства конструктора), запрещён флагом `erasableSyntaxOnly`;
- импорт только типов пишется как `import type`, этого требует `verbatimModuleSyntax`;
- типы при запуске не проверяются — это делает `npm run typecheck`.

## Проверки перед push

Тестам нужен запущенный PostgreSQL из `compose.yaml`.

```sh
npm run lint
npm run typecheck
npm test
```
