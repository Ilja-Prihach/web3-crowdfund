# Backend

Статус: каркас, подключение к PostgreSQL, схема indexer и модуль `chain` с ABI контракта. Есть сервер Fastify с маршрутами `GET /health` и `GET /ready`, проверка конфигурации при старте, плавная остановка, единый формат ошибок, пул PostgreSQL с Drizzle, первая миграция с таблицами событий и checkpoint, ESLint с проверкой типов и тесты на настоящей БД. Чтение логов, проекции, вход подписью и API каталога появятся следующими шагами этапа 5, см. [`docs/roadmap.md`](../docs/roadmap.md#этап-5-backend-и-blockchain-indexer).

## Стек

- Node.js 24 запускает TypeScript напрямую, вырезая типы (type stripping), без сборщика;
- Fastify — HTTP-сервер, схемы маршрутов — TypeBox;
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
| `APP_ORIGIN` | нет, обязательна | источник frontend, например `http://localhost:3000`, ровно без пути и косой черты в конце; из него берутся ожидаемые `domain` и `uri` сообщения входа; `http` — только для `localhost` |
| `SEPOLIA_RPC_URL` | нет, обязательна | `https`-адрес узла Sepolia (`http` — только для `localhost`); может содержать ключ провайдера, поэтому хранится только в `.env` и не логируется |
| `TRUST_PROXY` | пусто | адреса или CIDR reverse proxy через запятую, которому backend верит в `X-Forwarded-For`; пусто — лимиты по адресу соединения; никогда не сервер Next.js |
| `INDEXER_BATCH_SIZE` | `50` | блоков в одном `eth_getLogs`, 1–10 000; 1rpc больше 50 не отдаёт |
| `INDEXER_POLL_INTERVAL_MS` | `12000` | пауза между опросами, когда indexer догнал `finalized`, 1 000–3 600 000 мс |
| `TEST_DATABASE_URL` | `postgres://openfund:openfund@127.0.0.1:5433/openfund_test` | БД для `npm test`; имя базы обязано оканчиваться на `_test` |

Неверное значение останавливает процесс при старте с понятной ошибкой. Строка подключения и адрес узла в текст ошибки не попадают: в них пароль или ключ.

## Indexer

Indexer — отдельный процесс рядом с API: читает события V2 из Sepolia до блока `finalized` и пишет их в `chain_events`. Нужны применённые миграции (`npm run db:migrate`) и `SEPOLIA_RPC_URL` с историей логов.

```sh
npm run indexer
```

При старте он проверяет chain ID и историю узла, затем догружает события с блока deploy `12014545` пачками по `INDEXER_BATCH_SIZE` и пишет в лог каждую пачку: `fromBlock`, `toBlock`, `events`, `blocksBehind`. Первая догрузка через 1rpc занимает порядка часа; дальше — один запрос раз в 12 секунд. Отказы узла (`-32029`, `4444`) видны в логе как `indexer batch failed` и повторяются сами. Остановка — `Ctrl+C`: текущая пачка дописывается, и следующий запуск продолжит с checkpoint.

## Вход подписью

Маршруты: `POST /v1/auth/nonce` — одноразовый nonce, `POST /v1/auth/verify` — сообщение EIP-4361 с подписью, ставит cookie сессии, `GET /v1/auth/session` — текущая сессия, `POST /v1/auth/logout` — выход. Маршрут, которому нужен вход, подключает `preHandler: requireSession(db)` и читает `request.session`. Лимиты: 10 nonce и 10 проверок в минуту с одного адреса (IPv6 — с подсети `/64`), бюджет проверок через RPC и порог предупреждения о числе живых nonce — `defaultAuthLimits` в `src/modules/auth/service.ts`. Проверка вручную:

```sh
curl -i -X POST http://127.0.0.1:4000/v1/auth/nonce
```

Ответ `201` с `{"nonce":"…"}` и `cache-control: no-store`. Подписанное сообщение собирает frontend (#59); правила проверки — в [`docs/architecture.md`](../docs/architecture.md#backend).

## Миграции

Схема таблиц описывается в `src/db/schema.ts`. `npm run db:generate -- --name <что_меняется>` превращает её изменения в SQL-файл в `drizzle/` с понятным именем, а `npm run db:migrate` применяет новые миграции к `DATABASE_URL`; обе команды сами читают `.env`. Миграции коммитятся; база меняется только ими. Уже применённые миграции Drizzle помнит в схеме `drizzle` и повторно не выполняет.

Миграции:

- `0000_chain_events_and_checkpoints.sql` — журнал событий контракта и checkpoint indexer;
- `0001_auth_nonces_and_sessions.sql` — nonce и сессии входа подписью.

Подробности — в [`docs/architecture.md`](../docs/architecture.md#backend).

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

## Стенд Anvil

`src/test/anvil.ts` запускает `anvil --port 0 --chain-id 11155111`: свободный порт выбирает Anvil, а chain ID Sepolia позволяет использовать тот же клиент цепочки, что в приложении. `useAnvil(setup)` поднимает один узел на файл тестов, один раз выполняет `setup` и делает снимок (`evm_snapshot`) перед каждым тестом и откат (`evm_revert`) после — каждый тест видит ровно состояние после `setup`.

`src/test/crowdfunding.ts` разворачивает Crowdfunding V2 из `contracts/out` и даёт по функции на каждое действие: создание кампании, смена срока, вклад, отмена, возврат, вывод и перемотка времени. Каждая ждёт блок и возвращает события, разобранные backend-ABI. Ключи тестовых аккаунтов Anvil общеизвестны и живут только в `src/test/`; тест проверяет, что в коде приложения их нет.

## Проверки перед push

Тестам нужны запущенный PostgreSQL из `compose.yaml` и установленный Foundry: `npm test` сначала запускает `pretest` (`forge build` в `contracts/`), а интеграционные тесты поднимают собственный `anvil`. Тесты схемы стирают всю тестовую БД, поэтому `resetTestDatabase` сначала спрашивает у соединения `current_database()` и отказывается работать, если имя не оканчивается на `_test`: ошибка в `TEST_DATABASE_URL` не удалит рабочие данные. Файлы тестов выполняются по очереди (`--test-concurrency=1`): тесты схемы пересоздают тестовую БД и применяют миграции заново, и параллельный файл увидел бы её наполовину удалённой.

```sh
npm run lint
npm run typecheck
npm test
```
