# Диаграммы OpenFund

Исходники диаграмм находятся в отдельных файлах PlantUML в [`diagrams/`](diagrams/). Ниже показаны их изображения для просмотра на GitHub. Подробности реализации и ограничения описаны в [архитектуре](architecture.md), адреса контракта — в [deployment](deployments.md).

## Контекст системы — C4, уровень 1

[Исходник PlantUML](diagrams/01-context.puml)

![Контекст системы OpenFund](https://github.com/Ilja-Prihach/web3-crowdfund/releases/download/acceptance-screens/openfund-107-01-context.png)

В локальном демо вместо Sepolia используется Anvil и тестовые роли; транзакции отправляются в локальную сеть. Это альтернативный режим той же системы, а не связь с реальными средствами.

## Контейнеры — C4, уровень 2

[Исходник PlantUML](diagrams/02-containers.puml)

![Контейнеры OpenFund](https://github.com/Ilja-Prihach/web3-crowdfund/releases/download/acceptance-screens/openfund-107-02-containers.png)

Frontend на схеме включает сервер Next.js и код в браузере. В обычном режиме кошелёк отправляет транзакцию через настроенный в нём RPC; в демо роль использует локальный Anvil без расширения кошелька. PostgreSQL и файлы обложек — отдельные хранилища. Финансовое состояние и условия окончательно определяет контракт.

## Пожертвование

[Исходник PlantUML](diagrams/03-donation.puml)

![Последовательность пожертвования](https://github.com/Ilja-Prihach/web3-crowdfund/releases/download/acceptance-screens/openfund-107-03-donation.png)

Событие появляется в каталоге и ленте после обработки индексатором. Кошелёк может отклонить подпись, а транзакция — завершиться ошибкой уже после симуляции.

## Индексация и каталог

[Исходник PlantUML](diagrams/04-indexing.puml)

![Последовательность индексации и чтения каталога](https://github.com/Ilja-Prihach/web3-crowdfund/releases/download/acceptance-screens/openfund-107-04-indexing.png)

Indexer обрабатывает данные только до `finalized`, поэтому каталог может отставать от последних транзакций. При недоступности backend каталог может читать страницу из контракта с ограниченными фильтрами.

## Вход подписью SIWE

[Исходник PlantUML](diagrams/05-siwe.puml)

![Последовательность входа подписью](https://github.com/Ilja-Prihach/web3-crowdfund/releases/download/acceptance-screens/openfund-107-05-siwe.png)

Подпись сообщения не отправляет транзакцию и не расходует газ. На диаграмме показан успешный путь; ошибки проверки не создают сессию, а nonce используется однократно.

## Как обновить изображения

Нужны Java, Graphviz и PlantUML. Из корня репозитория, подставив путь к `plantuml.jar`:

```sh
mkdir -p /tmp/openfund-diagrams
java -jar /path/to/plantuml.jar -tpng -o /tmp/openfund-diagrams docs/diagrams/*.puml
```

Исходники не используют внешние `!include`. Полученные изображения нужно сверить с исходниками и обновить вложения, на которые ссылается эта страница; файлы сборки в репозиторий не добавляются.
