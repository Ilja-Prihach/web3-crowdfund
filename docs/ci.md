# Непрерывная интеграция (CI)

Проверки контрактов, frontend и backend выполняются автоматически в GitHub Actions. Конфигурации находятся в `.github/workflows/contracts.yml`, `.github/workflows/frontend.yml` и `.github/workflows/backend.yml`.

## Когда запускается

Workflows `Contracts CI`, `Frontend CI` и `Backend CI` запускаются при каждом pull request в `main` и при каждом push в `main`. Новый push отменяет незавершённый запуск того же workflow для той же ветки или pull request через `concurrency`, поэтому устаревший commit не занимает runner после появления новой версии.

Фильтр по путям (`paths`) намеренно не используется. Обязательный workflow, пропущенный фильтром, не сообщает статус, из-за чего pull request с изменениями только другой подсистемы нельзя было бы слить. Полный прогон бесплатен для публичного репозитория.

Workflow `PR metadata` запускается при открытии, повторном открытии, редактировании pull request и каждом новом push в его ветку (`synchronize`). Последний триггер нужен обязательной проверке: GitHub привязывает её к head commit, и без повторного запуска у нового коммита её бы не было, а merge ждал бы статуса бесконечно. Из-за `pull_request_target` workflow берётся из `main`, поэтому изменение самого workflow действует только после merge. Workflow не загружает и не исполняет код из ветки: проверяет только метаданные события. Название должно следовать Conventional Commits на английском и укладываться в 72 символа; описание должно связывать Issue строкой `Closes #N`, `Fixes #N` или `Resolves #N`.

## Что проверяется

Jobs `Format, build, test`, `Slither analysis`, `Lint, typecheck, build` и `Lint, typecheck, test` выполняются независимо на `ubuntu-latest`.

`Lint, typecheck, build` работает в каталоге `frontend/`:

1. Загружает репозиторий.
2. Устанавливает версию Node.js из `frontend/.nvmrc` и включает npm cache по lock-файлу.
3. `npm ci` — воспроизводимо устанавливает точные версии из `package-lock.json`.
4. `npm run lint` — проверяет исходники ESLint без допустимых предупреждений.
5. `npm run typecheck` — проверяет TypeScript без генерации файлов.
6. `npm test` — запускает unit-тесты чистых функций встроенным `node:test`.
7. `npm run build` — собирает production-версию Next.js.

`Lint, typecheck, test` работает в каталоге `backend/` и поднимает сервис PostgreSQL 18.4 с БД `openfund_test` на порту `5433`, как локальный `compose.yaml`; тесты получают его адрес через `TEST_DATABASE_URL`:

1. Загружает репозиторий вместе с подмодулями `contracts/lib`.
2. Устанавливает Foundry (`foundry-toolchain@v1`, как job контрактов): `forge` для сборки контрактов и `anvil` для интеграционных тестов.
3. Устанавливает версию Node.js из `backend/.nvmrc` и включает npm cache по lock-файлу.
4. `npm ci` — воспроизводимо устанавливает точные версии из `package-lock.json`.
5. `npm run lint` — ESLint с правилами, использующими типы TypeScript, без допустимых предупреждений.
6. `npm run typecheck` — проверяет TypeScript без генерации файлов.
7. `npm test` — сначала `pretest` собирает контракты (`forge build`), затем тесты встроенного `node:test` работают с настоящей БД и поднимают собственные узлы Anvil.

`Format, build, test` работает в каталоге `contracts/`:

1. Загружает репозиторий вместе с подмодулями `forge-std` и `openzeppelin-contracts`.
2. Устанавливает Foundry.
3. `forge fmt --check` — код отформатирован по правилам Foundry.
4. `forge lint src/Crowdfunding.sol --deny warnings` — production-контракт проходит встроенный статический анализ Foundry без новых предупреждений.
5. `forge build --sizes` — контракты компилируются и укладываются в лимит размера байткода.
6. `forge test -vvv` — проходят все тесты, включая fuzz- и invariant-тесты.

`Slither analysis` устанавливает Foundry и запускает Slither 0.11.6 для каталога `contracts/`. Результаты из `lib/`, `test/` и `script/` отфильтровываются, чтобы отчёт относился к production-коду. Предупреждения низкой и информационной серьёзности остаются видимыми, а находки средней и высокой серьёзности останавливают job.

Шаги внутри каждого job выполняются по порядку; первый упавший шаг останавливает этот job.

## Защита ветки `main`

- изменения попадают в `main` только через pull request;
- перед слиянием должны успешно пройти `Format, build, test`, `Slither analysis` и `Lint, typecheck, build`; новые checks frontend и backend добавляются в required checks после первого успешного запуска в GitHub;
- перед слиянием ветка должна быть обновлена до актуального `main`, чтобы CI проверял именно тот код, который попадёт в `main`;
- одобрение ревьюера не требуется, так как проект ведёт один разработчик;
- правила распространяются и на администраторов репозитория.

## Деплой

Автоматический деплой контрактов не настроен намеренно. Он потребовал бы хранить приватный ключ в секретах CI, а проект не допускает приватных ключей вне кошелька разработчика. Контракты развёртываются вручную через `forge script`.

## Локальная проверка перед push

Из каталога `frontend/`:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

Из каталога `contracts/`:

```sh
forge fmt --check
forge lint src/Crowdfunding.sol --deny warnings
forge build --sizes
forge test
slither . --filter-paths "(lib/|test/|script/)" --fail-medium
```

Из каталога `backend/`, после `docker compose up -d --wait` в корне репозитория; нужен установленный Foundry (`forge`, `anvil`):

```sh
npm ci
npm run lint
npm run typecheck
npm test
```
