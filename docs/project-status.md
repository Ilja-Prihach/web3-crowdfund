# Текущее состояние проекта

Обновлено: 28 октября 2026 года. Снимок проверен в рабочей ветке `feature/funding-modes` на коммите `8a91a9f` с незакоммиченной реализацией V2.

## Текущий этап

Контракт V1 завершён, протестирован и развёрнут в Ethereum Sepolia. В ветке `feature/funding-modes` реализуется V2 с режимами `FixedDeadline` и `OpenEnded`; production-код и тесты уже обновлены, но изменения ещё не закоммичены и V2 не развёрнут.

Текущий учебный фокус пользователя — Solidity и Foundry. Frontend и backend начнутся после стабилизации V2 ABI.

Продуктовая концепция описана в [`product-vision.md`](product-vision.md), порядок этапов — в [`roadmap.md`](roadmap.md).

## Что работает в текущей V2-ветке

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

- 70 тестов Foundry проходят локально: unit, fuzz, invariant, transfer-failure и reentrancy-сценарии;
- `forge fmt --check src test script`, `forge lint src/Crowdfunding.sol --deny warnings` и `git diff --check` проходят;
- V1 на `main` имел 100% покрытия; покрытие изменённого V2 ещё нужно измерить;
- CI проверяет formatting, build, tests, gas snapshot и Slither;
- защита `main` требует успешных CI-проверок;
- исходники V1 Sepolia deployment получили Sourcify `exact_match`.

Подробности тестовой стратегии находятся в [`../contracts/test/README.md`](../contracts/test/README.md), безопасности — в [`security.md`](security.md), CI — в [`ci.md`](ci.md).

## Публичное развёртывание

Текущий V1-контракт в Sepolia: [`0x480EC361EBDD78465831eb555d3eFcF650D2A217`](https://sepolia.etherscan.io/address/0x480EC361EBDD78465831eb555d3eFcF650D2A217). V2 ещё не развёрнут.

Chain ID, deployment-транзакция, gas и верификация записаны в [`deployments.md`](deployments.md).

## Следующий учебный шаг

Завершить V2 перед коммитами и Sepolia deployment:

1. построчно разобрать с пользователем текущие изменения `Campaign`, `FundingMode` и денежных переходов;
2. проверить недостающие границы в unit, fuzz и invariant-модели;
3. измерить coverage, прогнать Slither и оценить изменение gas snapshot;
4. разделить production-код, тесты и документацию на логические коммиты;
5. после стабилизации ABI развернуть V2 в Sepolia и пройти fixed/open-ended сценарии через `cast`.

## Известные ограничения

- frontend пока содержит только placeholder README;
- backend и blockchain indexer ещё не созданы; PostgreSQL является кандидатом, но не утверждённым выбором;
- текущая V2-реализация находится в незакоммиченном рабочем дереве и ещё не прошла полный coverage/Slither/gas-review;
- контракт развёрнут только в тестовой сети, Mainnet deployment не планируется на текущем этапе;
- исходники подтверждены Sourcify, но отдельно через Etherscan API не верифицировались;
- актуальная Sepolia оценивает deployment gas значительно выше локальной Cancun-симуляции; перед следующим deployment требуется RPC estimate, см. [`gotchas.md`](gotchas.md#sepolia-deployment-gas-differs-from-local-simulation).
