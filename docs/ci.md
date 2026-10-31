# Непрерывная интеграция (CI)

Проверки контрактов и frontend выполняются автоматически в GitHub Actions. Конфигурации находятся в `.github/workflows/contracts.yml` и `.github/workflows/frontend.yml`.

## Когда запускается

Workflows `Contracts CI` и `Frontend CI` запускаются при каждом pull request в `main` и при каждом push в `main`.

Фильтр по путям (`paths`) намеренно не используется. Обязательный workflow, пропущенный фильтром, не сообщает статус, из-за чего pull request с изменениями только другой подсистемы нельзя было бы слить. Полный прогон бесплатен для публичного репозитория.

## Что проверяется

Jobs `Format, build, test`, `Slither analysis` и `Lint, typecheck, build` выполняются независимо на `ubuntu-latest`.

`Lint, typecheck, build` работает в каталоге `frontend/`:

1. Загружает репозиторий.
2. Устанавливает версию Node.js из `frontend/.nvmrc` и включает npm cache по lock-файлу.
3. `npm ci` — воспроизводимо устанавливает точные версии из `package-lock.json`.
4. `npm run lint` — проверяет исходники ESLint без допустимых предупреждений.
5. `npm run typecheck` — проверяет TypeScript без генерации файлов.
6. `npm test` — запускает unit-тесты чистых функций встроенным `node:test`.
7. `npm run build` — собирает production-версию Next.js.

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
- перед слиянием должны успешно пройти `Format, build, test`, `Slither analysis` и `Lint, typecheck, build`; новый frontend check добавляется в required checks после первого успешного запуска в GitHub;
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
