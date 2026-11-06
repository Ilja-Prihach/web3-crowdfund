# Backend

Статус: каркас, подключение к PostgreSQL, схема indexer и модуль `chain` с ABI контракта. Есть сервер Fastify с маршрутами `GET /health` и `GET /ready`, проверка конфигурации при старте, плавная остановка, единый формат ошибок, пул PostgreSQL с Drizzle, первая миграция с таблицами событий и checkpoint, ESLint с проверкой типов и тесты на настоящей БД. Чтение логов, проекции, вход подписью и API каталога появятся следующими шагами этапа 5, см. [`docs/roadmap.md`](../docs/roadmap.md#этап-5-backend-и-blockchain-indexer).

## Стек

- Node.js 24 запускает TypeScript напрямую, вырезая типы (type stripping), без сборщика;
- Fastify — HTTP-сервер;
- viem — ABI, типы событий и клиент чтения Sepolia;
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
| `SEPOLIA_RPC_URL` | нет, обязательна | `http(s)`-адрес узла Sepolia; может содержать ключ провайдера, поэтому хранится только в `.env` и не логируется |
| `TEST_DATABASE_URL` | `postgres://openfund:openfund@127.0.0.1:5433/openfund_test` | БД для `npm test`; имя базы обязано оканчиваться на `_test` |

Неверное значение останавливает процесс при старте с понятной ошибкой. Строка подключения и адрес узла в текст ошибки не попадают: в них пароль или ключ.

## Миграции

Схема таблиц описывается в `src/db/schema.ts`. `npm run db:generate -- --name <что_меняется>` превращает её изменения в SQL-файл в `drizzle/` с понятным именем, а `npm run db:migrate` применяет новые миграции к `DATABASE_URL`; обе команды сами читают `.env`. Миграции коммитятся; база меняется только ими. Уже применённые миграции Drizzle помнит в схеме `drizzle` и повторно не выполняет.

Сейчас есть одна миграция — `0000_chain_events_and_checkpoints.sql`: журнал событий контракта и checkpoint indexer, см. [`docs/architecture.md`](../docs/architecture.md#backend).

Install-скрипты `esbuild`, которые тянет `drizzle-kit`, запрещены в `allowScripts` файла `package.json`: генерация миграций работает без них.

## ABI контракта

`src/chain/crowdfundingAbi.ts` сгенерирован из сборки Foundry и вручную не редактируется. После изменения контракта ABI обновляется в обоих приложениях:

```sh
cd contracts && forge build
cd ../frontend && npm run abi:export
cd ../backend && npm run abi:export
```

Тест `src/chain/contract.test.ts` падает, если копии ABI в backend и frontend разошлись или если адрес и блок deploy не совпадают с [`docs/deployments.md`](../docs/deployments.md).

## Ограничения type stripping

Node.js только вырезает типы, поэтому:

- в относительных импортах пишется расширение: `./app.ts`;
- синтаксис, который нельзя просто стереть (`enum`, `namespace`, параметры-свойства конструктора), запрещён флагом `erasableSyntaxOnly`;
- импорт только типов пишется как `import type`, этого требует `verbatimModuleSyntax`;
- типы при запуске не проверяются — это делает `npm run typecheck`.

## Проверки перед push

Тестам нужен запущенный PostgreSQL из `compose.yaml`. Тесты схемы стирают всю тестовую БД, поэтому `resetTestDatabase` сначала спрашивает у соединения `current_database()` и отказывается работать, если имя не оканчивается на `_test`: ошибка в `TEST_DATABASE_URL` не удалит рабочие данные. Файлы тестов выполняются по очереди (`--test-concurrency=1`): тесты схемы пересоздают тестовую БД и применяют миграции заново, и параллельный файл увидел бы её наполовину удалённой.

```sh
npm run lint
npm run typecheck
npm test
```
