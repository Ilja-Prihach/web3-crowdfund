# OpenFund

[![Contracts CI](https://github.com/Ilja-Prihach/web3-crowdfund/actions/workflows/contracts.yml/badge.svg?branch=main)](https://github.com/Ilja-Prihach/web3-crowdfund/actions/workflows/contracts.yml)
[![Frontend CI](https://github.com/Ilja-Prihach/web3-crowdfund/actions/workflows/frontend.yml/badge.svg?branch=main)](https://github.com/Ilja-Prihach/web3-crowdfund/actions/workflows/frontend.yml)
[![Backend CI](https://github.com/Ilja-Prihach/web3-crowdfund/actions/workflows/backend.yml/badge.svg?branch=main)](https://github.com/Ilja-Prihach/web3-crowdfund/actions/workflows/backend.yml)

OpenFund — учебное Web3-приложение для краудфандинга в ETH. Создатель запускает сбор, участники поддерживают его через кошелёк, а смарт-контракт определяет, когда деньги можно вывести или вернуть. Проект создан для изучения Solidity и демонстрации полного пути от контракта до пользовательского интерфейса.

![Каталог кампаний OpenFund в локальном демо](https://github.com/Ilja-Prihach/web3-crowdfund/releases/download/acceptance-screens/openfund-112-desktop.png)

[Каталог на телефоне](https://github.com/Ilja-Prihach/web3-crowdfund/releases/download/acceptance-screens/openfund-112-mobile.png)

## Что умеет

- Создание сборов с дедлайном или без него, пожертвования, возврат вкладов, отмена и вывод средств по правилам контракта.
- Каталог с поиском, фильтрами и страницами кампаний; профиль автора, история и участники сбора.
- Вход подписью кошелька, редактирование истории и обложки кампании до первого пожертвования.
- Локальное демо с тестовой сетью Anvil и ролями создателя и участника — без настройки браузерного кошелька.

Контракт хранит финансовое состояние и условия сбора. Подробная история, профиль и обложка хранятся в backend; их наличие и содержание не гарантируются контрактом. Каталог и история читаются из индексированных данных и могут отставать от сети. Подробнее — [архитектура](docs/architecture.md) и [диаграммы](docs/diagrams.md).

## Быстрый запуск демо

Нужны Git и работающий Docker Engine с Docker Compose. Из корня репозитория:

```sh
bash docker/demo/up.sh
```

Откройте [localhost:3000](http://localhost:3000) и выберите роль **Demo Creator** или **Demo Backer**. Пять кампаний и тестовые ETH создаются в локальной сети; настоящие средства не используются. Демо сохраняет данные между запусками.

Остановка демо, выбор другого порта и восстановление данных описаны в [инструкции Docker](docs/docker.md). Там же — запуск полного локального стека с публичной тестовой сетью Sepolia. Для работы с Sepolia через интерфейс нужен браузерный кошелёк и тестовый ETH; приложение не хранит приватные ключи.

## Технологии и устройство

| Часть | Технологии |
| --- | --- |
| Смарт-контракт | Solidity, Foundry, OpenZeppelin |
| Интерфейс | Next.js, React, TypeScript, SCSS Modules, wagmi, viem, TanStack Query |
| API и индексатор | Node.js, Fastify, PostgreSQL, Drizzle, viem |
| Локальный запуск | Docker Compose, Nginx, Anvil |

Контракт V2 развёрнут и верифицирован в Sepolia: [адрес и доказательства deployment](docs/deployments.md). Frontend MVP, backend, индексатор и локальный деморежим реализованы; дальнейшие задачи перечислены в [плане развития](docs/roadmap.md).

## Документация и разработка

- [Диаграммы системы и основных сценариев](docs/diagrams.md)
- [Карта кода для разработчиков и агентов](docs/code-map.md)
- [Архитектура и границы данных](docs/architecture.md)
- [Запуск, бэкапы и восстановление](docs/docker.md)
- [Состояние проекта](docs/project-status.md) и [продуктовая концепция](docs/product-vision.md)
- [Все документы](docs/README.md), [CI](docs/ci.md) и [рабочий процесс](docs/workflow.md)
