# Frontend

Статус: техническая основа, дизайн-система, application shell и editorial-главная реализованы. Web3-интеграция добавляется последовательностью небольших PR согласно [`docs/plans/frontend-mvp.md`](../docs/plans/frontend-mvp.md).

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

## Дизайн-система

- глобальные токены, reset, типографика и accessibility-правила находятся в `src/app/globals.scss` и `src/shared/styles`;
- `rem` используется для масштабируемой геометрии, `px` — для точных линий, focus и breakpoint-порогов;
- `Button`, `Field`, `Skeleton`, `EmptyState` и `ErrorState` находятся в `src/shared/ui`;
- `AppHeader` и `AppFooter` находятся в `src/widgets` и подключаются корневым layout;
- шрифты Manrope и PT Serif подключаются через `next/font`;
- анимации компонентов явно отключаются при `prefers-reduced-motion: reduce`;
- отображаемая нумерация начинается сразу с цифры без ведущего нуля: `1`, `2`, `3`.

## Изображения

Несжатые генерации не коммитятся. Для воспроизводимой конвертации используется:

```sh
npm run optimize:images -- <input> <output> [max-width] [quality]
```

Hero собран кодом: карточка правил V2-контракта, тост о переводе ETH в контракт и плашка с фактами о deployment. Растровый ассет не нужен, а фиктивная кампания не изображается. Скрипт оптимизации сохраняется для будущих растровых материалов.
