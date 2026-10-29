# Текущее состояние проекта

Обновлено: 29 октября 2026 года. Контрактный этап завершён; идёт Frontend MVP.

## Текущий этап

Контракт V2 с режимами `FixedDeadline` и `OpenEnded` реализован, полностью проверен, влит в `main`, развёрнут и верифицирован в Ethereum Sepolia. Fixed и open-ended сценарии выполнены on-chain через `cast`.

Текущий учебный фокус — поэтапная разработка frontend на Next.js, React и TypeScript. PR 1 создал воспроизводимую техническую основу, а PR 2 добавил дизайн-систему, доступные UI-примитивы и адаптивный application shell. Архитектура и очередь небольших PR зафиксированы в [`plans/frontend-mvp.md`](plans/frontend-mvp.md). Backend остаётся отложенным этапом.

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
- frontend проходит чистый `npm ci`, ESLint без предупреждений, TypeScript-проверку и production build Next.js;
- application shell проверен в Chromium на 360, 768, 1280 и 1440 px без горизонтального переполнения; подтверждены клавиатурный порядок, видимый skip-link, touch-размеры и `prefers-reduced-motion`;
- защита `main` требует успешных CI-проверок;
- PR #25 успешно прошёл remote CI и влит в `main` merge-коммитом `00abe0e`;
- исходники V1 Sepolia deployment получили Sourcify `exact_match`.
- исходники V2 Sepolia deployment получили Sourcify `exact_match`, а deployed bytecode точно совпал с локальной сборкой.

Подробности тестовой стратегии находятся в [`../contracts/test/README.md`](../contracts/test/README.md), безопасности — в [`security.md`](security.md), CI — в [`ci.md`](ci.md).

## Публичное развёртывание

Текущий V2-контракт в Sepolia: [`0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A`](https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A). V1 сохранён как предыдущая версия и не скрывается.

Chain ID, deployment-транзакция, gas и верификация записаны в [`deployments.md`](deployments.md).

## Следующий учебный шаг

После merge PR 2 начать PR 3 — editorial-главная:

1. реализовать Hero, Funding Modes и Trust sections;
2. создать и сжать авторскую hero-иллюстрацию в пределах медиабюджета;
3. использовать только подтверждённые продуктовые утверждения;
4. фактически проверить mobile и desktop композицию.

## Известные ограничения

- frontend пока содержит preview дизайн-системы без полноценной главной, изображений и Web3-интеграции;
- backend и blockchain indexer ещё не созданы; PostgreSQL является кандидатом, но не утверждённым выбором;
- контракт развёрнут только в тестовой сети, Mainnet deployment не планируется на текущем этапе;
- исходники подтверждены Sourcify, но отдельно через Etherscan API не верифицировались;
- актуальная Sepolia оценивает deployment gas значительно выше локальной Cancun-симуляции; перед любым следующим deployment требуется новый RPC estimate, см. [`gotchas.md`](gotchas.md#sepolia-deployment-gas-differs-from-local-simulation).
