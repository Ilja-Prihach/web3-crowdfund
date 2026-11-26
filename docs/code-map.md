# Карта кода OpenFund

Эта карта помогает найти место изменения. Она дополняет [маршрут чтения документации](README.md) и не заменяет [архитектуру](architecture.md), [решения](DECISIONS.md) и [рабочий процесс](workflow.md). Перед изменением учебного кода и контракта соблюдайте правила из [AGENTS.md](../AGENTS.md).

## С чего начать

| Задача | Где искать |
| --- | --- |
| Страницы и сборка интерфейса | [`frontend/src/app/`](../frontend/src/app/) — маршруты, layout и providers; [`frontend/src/widgets/`](../frontend/src/widgets/) — крупные блоки страниц |
| Каталог, карточки и состояние кампании | [`frontend/src/entities/campaign/`](../frontend/src/entities/campaign/) и [`frontend/src/widgets/CampaignCatalog/`](../frontend/src/widgets/CampaignCatalog/) |
| Создание сбора, вклад, возврат, отмена и вывод | [`frontend/src/features/`](../frontend/src/features/) — `campaign-create`, `campaign-donate`, `campaign-actions`; общий жизненный цикл — `transaction-status` |
| Редактирование истории, бюджета и обложки | [`frontend/src/features/campaign-editor/`](../frontend/src/features/campaign-editor/) и [`frontend/src/widgets/CampaignEditor/`](../frontend/src/widgets/CampaignEditor/); API и блокировка — [`backend/src/modules/campaigns/`](../backend/src/modules/campaigns/) |
| Кошелёк, сеть и ABI | [`frontend/src/features/wallet/`](../frontend/src/features/wallet/) и [`frontend/src/shared/config/`](../frontend/src/shared/config/); ABI генерируется, вручную не редактируется |
| Вход подписью | [`frontend/src/features/auth/`](../frontend/src/features/auth/) и [`backend/src/modules/auth/`](../backend/src/modules/auth/) |
| Профили | [`frontend/src/entities/profile/`](../frontend/src/entities/profile/), [`frontend/src/features/profile-edit/`](../frontend/src/features/profile-edit/) и [`backend/src/modules/profiles/`](../backend/src/modules/profiles/) |
| API кампаний, активность и донатеры | [`backend/src/modules/campaigns/`](../backend/src/modules/campaigns/) — маршруты, схемы и запросы |
| События, checkpoint и проекции | [`backend/src/indexer/`](../backend/src/indexer/), точка входа — [`backend/src/indexer.ts`](../backend/src/indexer.ts) |
| Схема базы и миграции | [`backend/src/db/schema.ts`](../backend/src/db/schema.ts), [`backend/drizzle/`](../backend/drizzle/) |
| Обработка и хранение обложек | [`backend/src/media/`](../backend/src/media/) и маршруты `details-routes.ts` в модуле кампаний |
| Правила и средства контракта | [`contracts/src/Crowdfunding.sol`](../contracts/src/Crowdfunding.sol), тесты в [`contracts/test/`](../contracts/test/) |
| Локальная сеть, gateway и демо | [`compose.yaml`](../compose.yaml), [`docker/demo/`](../docker/demo/) и [инструкция Docker](docker.md) |
| UI-компоненты и их состояния | [`frontend/src/shared/ui/`](../frontend/src/shared/ui/) и stories рядом с компонентами; запуск — [Storybook](../frontend/README.md#storybook) |

## Как связаны части

Страница собирает виджеты и фичи; интерфейс общается с кошельком и читает контракт через wagmi/viem. Запись в контракт проходит через кошелёк. Backend отдаёт каталог, историю и off-chain-данные; отдельный indexer переносит финализированные события в PostgreSQL. Схемы потоков — в [диаграммах](diagrams.md).

Источником финансового состояния остаётся блокчейн. Индексируемые события и проекции можно восстановить из сети, а профили, расширенные описания и загруженные файлы требуют резервного копирования. Фронтенд не получает приватный ключ пользователя.

## Где искать проверки

- Solidity: [`contracts/test/README.md`](../contracts/test/README.md), включая unit, fuzz и invariant.
- Frontend: тесты `*.test.ts` рядом с моделями и API; команды, Storybook и локальные браузерные проверки — в [`frontend/README.md`](../frontend/README.md).
- Backend: тесты рядом с модулями и индексатором, помощники в [`backend/src/test/`](../backend/src/test/); команды и отдельная тестовая база — в [`backend/README.md`](../backend/README.md).
- CI и обязательные проверки: [`docs/ci.md`](ci.md); порядок задачи, ветки и PR: [`docs/workflow.md`](workflow.md).

Если нужно менять поведение, сначала найдите его каноническое описание и существующие проверки. Если фактический код и документация расходятся, проверьте реализацию и обновите соответствующий документ вместе с изменением.
