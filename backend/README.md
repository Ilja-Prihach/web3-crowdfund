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

Полный стек запускается по [инструкции Docker Compose](../docs/docker.md). Ниже описан запуск backend с локальным Node.js.

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
| `INDEXER_BATCH_SIZE` | `2000` | блоков в одном `eth_getLogs`, 1–10 000; подбирается под окно провайдера |
| `INDEXER_POLL_INTERVAL_MS` | `12000` | пауза между опросами, когда indexer догнал `finalized`, 1 000–3 600 000 мс |
| `MEDIA_DIR` | `storage/media` | папка загруженных обложек кампаний, путь от папки запуска приводится к абсолютному; файлы не восстанавливаются из блокчейна и требуют бэкапов |
| `TEST_DATABASE_URL` | `postgres://openfund:openfund@127.0.0.1:5433/openfund_test` | БД для `npm test`; имя базы обязано оканчиваться на `_test` |

Неверное значение останавливает процесс при старте с понятной ошибкой. Строка подключения и адрес узла в текст ошибки не попадают: в них пароль или ключ.

## Indexer

Indexer — отдельный процесс рядом с API: читает события V2 из Sepolia до блока `finalized` и пишет их в `chain_events`. Нужны применённые миграции (`npm run db:migrate`) и `SEPOLIA_RPC_URL` с историей логов.

```sh
npm run indexer
```

При старте он проверяет chain ID и историю узла, затем догружает события с блока deploy `12014545` пачками по `INDEXER_BATCH_SIZE` и пишет в лог каждую пачку: `fromBlock`, `toBlock`, `events`, `blocksBehind`. Первая догрузка через Tenderly занимает около полутора минут; дальше — один запрос раз в 12 секунд. Отказы узла (`403`, `-32029`, `4444`) видны в логе как `indexer batch failed` и повторяются сами. Остановка — `Ctrl+C`: текущая пачка дописывается, и следующий запуск продолжит с checkpoint.

В той же транзакции, что и события, indexer обновляет проекции `campaigns` и `contributions`. Догнав `finalized`, он сверяет их с контрактом на блоке checkpoint — сразу после старта и затем раз в час. В логе это `projections match the contract`; расхождение — `projections differ from the contract` уровня `error` со списком кампаний и полей.

Пересобрать проекции из журнала `chain_events`:

```sh
npm run indexer:rebuild
```

Команда безопасна при работающем indexer: они ждут друг друга. Её нужно запустить один раз после миграции `0002`, если в базе уже были события: иначе первое событие старой кампании остановит пачку ошибкой `campaign is not in the projection`. После миграции `0003` она же дочитывает время блока у уже записанных событий (`fetchedBlockTimes` в логе): без этого в ленте у них `blockTimestamp: null`. Ещё её запускают после исправления причины расхождения.

## Обложки кампаний

Загруженные обложки лежат в `MEDIA_DIR` (по умолчанию `backend/storage/media`, в `.gitignore`). Восстановить их из блокчейна нельзя: папку нужно копировать в бэкап вместе с базой.

Создатель управляет обложкой и расширенными данными на `/campaigns/:id/edit` после входа подписью. Редактирование разрешено только до первого пожертвования. Операторская команда остаётся для первичного оформления demo-кампаний и подчиняется той же блокировке:

```sh
npm run media:import-cover -- <campaignId> <file> [--category open_source|education|creative|apps|community]
```

Команда пережимает файл тем же `processCover`, что и маршрут загрузки, а в `updated_by` пишет создателя кампании из контракта. Проверки сессии нет: у оператора и так доступ к базе, но текущая сумма читается из контракта, а история пожертвований — из `chain_events`; после первого доната импорт отклоняется. Обложки demo-кампаний 3–8 перенесены так 20 ноября 2026 года (#98); исходные файлы — в истории git, папка `frontend/src/entities/campaign/CampaignArtwork/assets` в коммите `cba8bca`:

```sh
git show cba8bca:frontend/src/entities/campaign/CampaignArtwork/assets/tool-library.webp > /tmp/tool-library.webp
npm run media:import-cover -- 3 /tmp/tool-library.webp --category community
```

Категории demo-кампаний: 3 и 8 — `community`, 4 — `creative`, 5 и 6 — `open_source`, 7 — `education`.

## Профили пользователей

После `npm run db:migrate` миграция `0005` добавляет таблицу профилей. Профиль создаётся первым `PUT /v1/profiles/me` с действующей SIWE-cookie. Тело: `{ "name": "Имя", "bio": "О себе" }`; оба поля могут быть null, лимиты — 80 и 1000 символов. Владелец определяется только сессией. GET `/v1/profiles/:address` публичный; без заполненного профиля — 404.

Frontend дополнительно передаёт `expectedAddress` — адрес открытой формы. Если он не совпадает с сессией (например, вход сменился в другой вкладке), PUT отвечает `403 PROFILE_OWNER_CHANGED` до записи. Поле необязательно для совместимости API; переданный адрес никогда не назначает владельца вместо сессии.

История кампаний доступна без профиля: `/v1/profiles/:address/campaigns/created` и `/supported`, с limit/offset и finalizedBlock. Поддержанные включают кампании после полного возврата. API первой версии связывает профиль с одним кошельком; подробности — [`DECISIONS`](../docs/DECISIONS.md#profiles-use-one-verified-wallet). Профили нужно резервировать вместе с остальными off-chain-данными.

## Вход подписью (SIWE)

Маршруты: `POST /v1/auth/nonce` — одноразовый nonce, `POST /v1/auth/verify` — сообщение EIP-4361 с подписью, ставит cookie сессии, `GET /v1/auth/session` — текущая сессия, `POST /v1/auth/logout` — выход. Маршрут, которому нужен вход, подключает `preHandler: requireSession(db)` и читает `request.session`. Лимиты: 10 nonce и 10 проверок в минуту с одного адреса (IPv6 — с подсети `/64`), бюджет проверок через RPC и порог предупреждения о числе живых nonce — `defaultAuthLimits` в `src/modules/auth/service.ts`. Проверка вручную:

```sh
curl -i -X POST http://127.0.0.1:4000/v1/auth/nonce
```

Ответ `201` с `{"nonce":"…"}` и `cache-control: no-store`. Подписанное сообщение собирает frontend (#59); правила проверки — в [`docs/architecture.md`](../docs/architecture.md#backend).

## Каталог

`GET /v1/campaigns` отдаёт каталог из проекций indexer: поиск `q`, фильтры `status` (можно повторять) и `mode`, сортировка `sort=newest|oldest|raised`, страницы `limit` (до 50) и `offset` (до 10 000). `GET /v1/campaigns/:id` — одна кампания, у каждой есть `donors` — число текущих донатеров. `GET /v1/campaigns/:id/activity` — лента событий кампании от новых к старым, следующая страница — `?before=<nextCursor>`. `GET /v1/campaigns/:id/donors` — донатеры по убыванию вклада, с суммой внесённого, возвращённого и числом вкладов. Все ответы содержат `finalizedBlock` — блок, на котором основаны данные; полная схема — в [`docs/architecture.md`](../docs/architecture.md#backend). Проверка вручную:

```sh
curl -s 'http://127.0.0.1:4000/v1/campaigns?status=active&sort=raised&limit=3'
curl -s 'http://127.0.0.1:4000/v1/campaigns/1/activity?limit=2'
curl -s 'http://127.0.0.1:4000/v1/campaigns/1/donors'
```

## Миграции

Схема таблиц описывается в `src/db/schema.ts`. `npm run db:generate -- --name <что_меняется>` превращает её изменения в SQL-файл в `drizzle/` с понятным именем, а `npm run db:migrate` применяет новые миграции к `DATABASE_URL`; обе команды сами читают `.env`. Миграции коммитятся; база меняется только ими. Уже применённые миграции Drizzle помнит в схеме `drizzle` и повторно не выполняет.

Миграции:

- `0000_chain_events_and_checkpoints.sql` — журнал событий контракта и checkpoint indexer;
- `0001_auth_nonces_and_sessions.sql` — nonce и сессии входа подписью;
- `0002_campaign_projections.sql` — проекции indexer: метаданные, кампании и вклады;
- `0003_event_block_time.sql` — время блока у событий и индекс ленты кампании.

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
