# Текущее состояние проекта

Обновлено: 30 октября 2026 года. Контрактный этап завершён; идёт Frontend MVP.

## Текущий этап

Контракт V2 с режимами `FixedDeadline` и `OpenEnded` реализован, полностью проверен, влит в `main`, развёрнут и верифицирован в Ethereum Sepolia. Fixed и open-ended сценарии выполнены on-chain через `cast`.

Текущий учебный фокус — поэтапная разработка frontend на Next.js, React и TypeScript. PR 1 создал воспроизводимую техническую основу, PR 2 добавил дизайн-систему и application shell, а PR 3 перевёл главную на карточное направление по локальным мокапам: иллюстрированные hero, шаги и режимы, блок доверия со сценой-сейфом, финальный CTA и мобильное меню. Архитектура и очередь небольших PR зафиксированы в [`plans/frontend-mvp.md`](plans/frontend-mvp.md). Backend остаётся отложенным этапом.

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
- карточная главная проверена в Chromium на 360, 390, 768, 1024, 1280 и 1440 px: горизонтального переполнения нет, все внутренние якоря существуют, семь оптимизированных WebP-сцен весят вместе около 103 KB, мобильное меню открывается и закрывается, а desktop и mobile сверены с рендером `home`;
- защита `main` требует успешных CI-проверок;
- PR #25 успешно прошёл remote CI и влит в `main` merge-коммитом `00abe0e`;
- исходники V1 Sepolia deployment получили Sourcify `exact_match`.
- исходники V2 Sepolia deployment получили Sourcify `exact_match`, а deployed bytecode точно совпал с локальной сборкой.

Подробности тестовой стратегии находятся в [`../contracts/test/README.md`](../contracts/test/README.md), безопасности — в [`security.md`](security.md), CI — в [`ci.md`](ci.md).

## Публичное развёртывание

Текущий V2-контракт в Sepolia: [`0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A`](https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A). V1 сохранён как предыдущая версия и не скрывается.

Chain ID, deployment-транзакция, gas и верификация записаны в [`deployments.md`](deployments.md).

## Следующий учебный шаг

После merge PR 3 начать PR 4 — Web3 foundation и кошелёк:

1. добавить `wagmi`, `viem`, TanStack Query и ABI V2;
2. настроить providers и Sepolia config;
3. реализовать подключение injected wallet, адрес и network badge;
4. локализовать отключённый кошелёк, неправильную сеть, отклонение запроса и RPC-ошибку.

## Известные ограничения

- frontend пока не подключает кошелёк, не читает кампании и не отправляет Web3-транзакции;
- backend и blockchain indexer ещё не созданы; PostgreSQL является кандидатом, но не утверждённым выбором;
- контракт развёрнут только в тестовой сети, Mainnet deployment не планируется на текущем этапе;
- исходники подтверждены Sourcify, но отдельно через Etherscan API не верифицировались;
- актуальная Sepolia оценивает deployment gas значительно выше локальной Cancun-симуляции; перед любым следующим deployment требуется новый RPC estimate, см. [`gotchas.md`](gotchas.md#sepolia-deployment-gas-differs-from-local-simulation).
