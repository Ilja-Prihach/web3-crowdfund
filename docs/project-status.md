# Текущее состояние проекта

Обновлено: 28 октября 2026 года. Контрактный этап завершён; выбран переход к Frontend MVP.

## Текущий этап

Контракт V2 с режимами `FixedDeadline` и `OpenEnded` реализован, полностью проверен, влит в `main`, развёрнут и верифицирован в Ethereum Sepolia. Fixed и open-ended сценарии выполнены on-chain через `cast`.

Текущий учебный фокус — поэтапная разработка frontend на Next.js, React и TypeScript. Архитектура и очередь небольших PR зафиксированы в [`plans/frontend-mvp.md`](plans/frontend-mvp.md). Backend остаётся отложенным этапом.

Продуктовая концепция описана в [`product-vision.md`](product-vision.md), порядок этапов — в [`roadmap.md`](roadmap.md).

## Что работает в V2

- создание fixed-кампаний сроком от 1 до 365 дней и open-ended-кампаний без дедлайна;
- изменение дедлайна fixed-кампании creator до первого пожертвования;
- пожертвования в ETH и учёт личных вкладов;
- немедленный успех при достижении цели и запрет последующих пожертвований;
- отмена кампании creator до достижения цели;
- вывод средств сразу после достижения цели;
- возврат вкладов проваленной или отменённой кампании;
- активный возврат из open-ended-кампании до достижения цели;
- вычисляемые статусы кампании;
- ограниченная постраничная загрузка кампаний;
- события для всех финансовых и жизненных переходов кампании;
- deployment через Foundry и чтение состояния через `cast`.

## Проверенное качество

- 77 тестов Foundry проходят локально: unit, fuzz, invariant, transfer-failure и reentrancy-сценарии;
- `forge fmt --check src test script`, `forge lint src/Crowdfunding.sol --deny warnings` и `git diff --check` проходят;
- production-контракт V2 имеет 100% покрытия строк, выражений, веток и функций;
- fixed и open-ended invariant-модели проходят по 128 последовательностей глубиной 100 действий без неожиданных `revert`;
- Slither не нашёл medium/high-проблем; ожидаемые информационные находки по timestamp и low-level `call` проверены вручную;
- gas snapshot обновлён после проверки роста: deployment-тест вырос примерно на 16,9% из-за нового ABI и переходов V2;
- CI проверяет formatting, build, tests, gas snapshot и Slither;
- защита `main` требует успешных CI-проверок;
- PR #25 успешно прошёл remote CI и влит в `main` merge-коммитом `00abe0e`;
- исходники V1 Sepolia deployment получили Sourcify `exact_match`.
- исходники V2 Sepolia deployment получили Sourcify `exact_match`, а deployed bytecode точно совпал с локальной сборкой.

Подробности тестовой стратегии находятся в [`../contracts/test/README.md`](../contracts/test/README.md), безопасности — в [`security.md`](security.md), CI — в [`ci.md`](ci.md).

## Публичное развёртывание

Текущий V2-контракт в Sepolia: [`0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A`](https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A). V1 сохранён как предыдущая версия и не скрывается.

Chain ID, deployment-транзакция, gas и верификация записаны в [`deployments.md`](deployments.md).

## Следующий учебный шаг

После merge документационного PR начать PR 1 — bootstrap и quality gate:

1. инициализировать Next.js App Router, React и TypeScript в `frontend/`;
2. добавить Sass, lint, typecheck и production build;
3. добавить frontend job в CI;
4. не смешивать bootstrap с визуальной системой или Web3-интеграцией.

## Известные ограничения

- frontend пока содержит только принятый план и архитектурные правила; приложение ещё не инициализировано;
- backend и blockchain indexer ещё не созданы; PostgreSQL является кандидатом, но не утверждённым выбором;
- контракт развёрнут только в тестовой сети, Mainnet deployment не планируется на текущем этапе;
- исходники подтверждены Sourcify, но отдельно через Etherscan API не верифицировались;
- актуальная Sepolia оценивает deployment gas значительно выше локальной Cancun-симуляции; перед любым следующим deployment требуется новый RPC estimate, см. [`gotchas.md`](gotchas.md#sepolia-deployment-gas-differs-from-local-simulation).
