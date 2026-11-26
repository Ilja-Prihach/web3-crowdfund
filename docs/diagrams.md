# Диаграммы OpenFund

Диаграммы показывают текущую реализацию. Они написаны на Mermaid и отображаются в GitHub; подробности и ограничения находятся в [архитектуре](architecture.md), а адреса контракта — в [deployment](deployments.md).

## Контекст системы — C4, уровень 1

```mermaid
flowchart LR
    User["Посетитель / создатель / участник"]
    Wallet["Кошелёк пользователя"]
    System["OpenFund<br/>Web3-приложение"]
    Chain["Ethereum Sepolia<br/>контракт Crowdfunding V2"]

    User -->|"Открывает сайт и управляет сбором"| System
    User -->|"Подтверждает подписи и транзакции"| Wallet
    System -->|"Запрашивает подпись"| Wallet
    System -->|"Читает состояние и события через RPC"| Chain
    Wallet -->|"Отправляет транзакции через свой RPC"| Chain
```

В локальном демо вместо Sepolia используется Anvil и тестовые роли; транзакции отправляются в локальную сеть. Это альтернативный режим той же системы, а не связь с реальными средствами.

## Контейнеры — C4, уровень 2

```mermaid
flowchart TB
    User["Пользователь"]
    Wallet["Кошелёк"]
    RPC["RPC сети"]
    Contract["Контракт V2<br/>Sepolia или Anvil"]

    subgraph OpenFund["OpenFund — локальный Compose"]
        Gateway["Nginx"]
        Web["Frontend<br/>Next.js + браузер"]
        API["Backend API<br/>Fastify"]
        Indexer["Indexer<br/>Node.js"]
        DB[("PostgreSQL")]
        Media[("Файлы обложек")]
    end

    User --> Gateway
    Gateway -->|"страницы"| Web
    Gateway -->|"/api/*"| API
    Web -->|"запросы через Nginx"| API
    Web -->|"подпись"| Wallet
    Wallet -->|"транзакции"| RPC
    Web -->|"чтение, симуляция"| RPC
    API -->|"данные, сессии"| DB
    API -->|"обложки"| Media
    API -->|"проверки"| RPC
    Indexer -->|"логи"| RPC
    Indexer -->|"проекции, checkpoint"| DB
    RPC --> Contract
```

В диаграмме frontend включает сервер Next.js и код в браузере. В основном режиме кошелёк отправляет транзакцию через настроенный в нём RPC. В демо роль использует локальный Anvil; кошелёк-расширение не требуется. PostgreSQL и медиа — отдельные хранилища; доступные пользователю суммы и условия окончательно определяет контракт.

## Пожертвование

```mermaid
sequenceDiagram
    actor User as Участник
    participant Web as Frontend
    participant RPC as RPC сети
    participant Wallet as Кошелёк
    participant Contract as Контракт V2

    User->>Web: Вводит сумму и нажимает «Поддержать»
    Web->>RPC: simulateContract donate (eth_call)
    RPC->>Contract: Проверка вызова без изменения состояния
    Contract-->>RPC: Результат симуляции
    RPC-->>Web: Успех или ошибка
    alt Симуляция прошла
        Web->>Wallet: Запрос на отправку транзакции
        Wallet->>User: Подтверждение транзакции
        User->>Wallet: Подписывает
        Wallet->>RPC: Отправляет подписанную транзакцию
        RPC-->>Wallet: Hash транзакции
        Wallet-->>Web: Hash транзакции
        Web->>RPC: Ожидает receipt
        RPC->>Contract: Включение donate и ETH в блок
        Contract-->>RPC: Результат и событие DonationMade
        RPC-->>Web: Receipt
        Web->>RPC: Перечитывает состояние и вклад
        Web-->>User: Показывает результат
    else Симуляция не прошла
        Web-->>User: Показывает ошибку без отправки
    end
```

Событие становится доступно каталогу и ленте после обработки индексатором. Кошелёк может отклонить подпись, а транзакция — завершиться ошибкой уже после симуляции.

## Индексация и каталог

```mermaid
sequenceDiagram
    participant Indexer as Indexer
    participant RPC as RPC сети
    participant DB as PostgreSQL
    participant API as Backend API
    participant Web as Frontend
    actor User as Посетитель

    Indexer->>RPC: Запрашивает finalized-блок
    RPC-->>Indexer: Номер блока
    Indexer->>DB: Читает checkpoint
    DB-->>Indexer: Последний обработанный блок
    Indexer->>RPC: Читает логи и нужные метаданные пачки
    RPC-->>Indexer: События и данные контракта
    Indexer->>DB: Одна транзакция: события, проекции, checkpoint
    Note over Indexer,DB: Повторная обработка не дублирует события
    User->>Web: Открывает каталог
    Web->>API: GET /api/v1/campaigns с фильтрами и страницей
    API->>DB: Читает проекции и checkpoint
    DB-->>API: Кампании и обработанный блок
    API-->>Web: Страница каталога
    Web-->>User: Показывает кампании и задержку данных
```

Indexer обрабатывает данные только до `finalized`, поэтому каталог может отставать от последних транзакций. При недоступности backend каталог может читать страницу из контракта с ограниченными фильтрами.

## Вход подписью SIWE

```mermaid
sequenceDiagram
    actor User as Пользователь
    participant Web as Frontend
    participant Wallet as Кошелёк
    participant API as Backend API
    participant DB as PostgreSQL
    participant RPC as RPC сети

    User->>Web: Нажимает «Войти подписью»
    Web->>API: POST /api/v1/auth/nonce
    API->>DB: Сохраняет одноразовый nonce
    API-->>Web: Nonce
    Web->>Wallet: Сообщение SIWE для подписи
    Wallet->>User: Показывает сообщение
    User->>Wallet: Подписывает сообщение
    Wallet-->>Web: Подпись
    Web->>API: POST /api/v1/auth/verify: сообщение и подпись
    API->>API: Проверяет поля сообщения
    API->>DB: Погашает действительный nonce
    API->>API: Восстанавливает адрес из подписи
    opt Локально восстановить адрес не удалось
        API->>RPC: Проверка смарт-кошелька в пределах лимита
        RPC-->>API: Результат проверки
    end
    API->>DB: Создаёт сессию с хэшем идентификатора
    API-->>Web: Данные сессии и HttpOnly-cookie
    Web-->>User: Показывает вход на сайт
```

Подпись сообщения не отправляет транзакцию и не расходует газ. На диаграмме показан успешный путь; ошибки проверки не создают сессию, а nonce используется однократно.
