# Frontend

Статус: техническая основа инициализирована. Визуальная система и Web3-интеграция добавляются последовательностью небольших PR согласно [`docs/plans/frontend-mvp.md`](../docs/plans/frontend-mvp.md).

## Принятый стек

- Next.js App Router;
- React и TypeScript;
- SCSS Modules;
- wagmi, viem и TanStack Query для Web3-слоя;
- Ethereum Sepolia и V2-контракт из [`docs/deployments.md`](../docs/deployments.md).

Точные версии production- и development-зависимостей закреплены в `package.json` и `package-lock.json`. Проект поддерживает Node.js 24 и проверяет допустимый диапазон через `engines`.

## Локальный запуск

Из каталога `frontend/`:

```sh
nvm use
npm ci
npm run dev
```

Приложение будет доступно по адресу `http://localhost:3000`. Переменные окружения создаются локально на основе `.env.example`; файлы `.env*`, кроме примеров, не коммитятся.

## Проверки

```sh
npm run lint
npm run typecheck
npm run build
```

Те же команды после чистого `npm ci` выполняет workflow `Frontend CI`. Предупреждения ESLint считаются ошибками.

## Архитектурные правила

- `app` собирает маршруты и providers;
- `widgets` содержит крупные секции страниц;
- `features` содержит пользовательские действия;
- `entities` содержит доменное представление кампании;
- `shared` содержит только переиспользуемые UI-примитивы, config, lib, styles и общие assets;
- самостоятельный компонент хранит `ComponentName.tsx` и `ComponentName.module.scss` в одной папке;
- локальные изображения секции лежат в её `assets/`;
- растровые изображения оптимизируются до коммита и подключаются через `next/image`.

Текущая страница намеренно является минимальным placeholder без дизайн-системы: визуальный shell появится в PR 2, а изображения — в PR 3.
