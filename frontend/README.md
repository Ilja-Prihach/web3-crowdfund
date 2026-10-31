# Frontend

Статус: техническая основа, дизайн-система, application shell, главная и подключение браузерного кошелька в Sepolia реализованы. Чтение кампаний и транзакции добавляются следующими PR согласно [`docs/plans/frontend-mvp.md`](../docs/plans/frontend-mvp.md).

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

`NEXT_PUBLIC_SEPOLIA_RPC_URL` необязателен: пустое значение означает публичный RPC Sepolia из viem. Префикс `NEXT_PUBLIC_` вшивает значение в клиентский JavaScript, поэтому URL с приватным API-ключом сюда не кладётся.

Для подключения кошелька нужен браузерный кошелёк (например, MetaMask) с включённой сетью Sepolia. Используйте отдельный учебный кошелёк без реальных средств.

## Проверки

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

`npm test` запускает unit-тесты `src/**/*.test.ts` встроенным `node:test`; Node.js 24 выполняет TypeScript без сборки. Те же команды после чистого `npm ci` выполняет workflow `Frontend CI`. Предупреждения ESLint считаются ошибками.

## Архитектурные правила

- `app` собирает маршруты и providers;
- `widgets` содержит крупные секции страниц;
- `features` содержит пользовательские действия;
- `entities` содержит доменное представление кампании;
- `shared` содержит только переиспользуемые UI-примитивы, config, lib, styles и общие assets;
- самостоятельный компонент хранит `ComponentName.tsx` и `ComponentName.module.scss` в одной папке;
- локальные изображения секции лежат в её `assets/`;
- растровые изображения оптимизируются до коммита и подключаются через `next/image`.

## ABI контракта

`src/shared/config/crowdfundingAbi.ts` генерируется из сборки Foundry и вручную не редактируется. После изменения контракта:

```sh
cd ../contracts && forge build
cd ../frontend && npm run abi:export
```

Адрес V2, сеть и ссылка на Etherscan заданы в `src/shared/config/web3.ts`; в компонентах они только импортируются.

## Дизайн-система

- глобальные токены, reset, типографика и accessibility-правила находятся в `src/app/globals.scss` и `src/shared/styles`;
- светлая и тёмная темы используют общие семантические токены; первый визит следует системной теме, а явный выбор хранится в `localStorage` под ключом `openfund-theme`;
- theme-логика и доступный переключатель находятся в `src/features/theme`; desktop использует шапку, mobile — выпадающее меню;
- `rem` используется для масштабируемой геометрии, `px` — для точных линий, focus и breakpoint-порогов;
- `Button`, `Field`, `Skeleton`, `EmptyState` и `ErrorState` находятся в `src/shared/ui`;
- `AppHeader` и `AppFooter` находятся в `src/widgets` и подключаются корневым layout;
- знак OpenFund — компонент `BrandMark` в `src/shared/ui` (тона `light` и `dark`), favicon — `src/app/icon.svg` с тем же рисунком;
- шрифты Manrope и PT Serif подключаются через `next/font`;
- анимации компонентов явно отключаются при `prefers-reduced-motion: reduce`;
- отображаемая нумерация начинается сразу с цифры без ведущего нуля: `1`, `2`, `3`.

## Изображения

Несжатые генерации не коммитятся. Для воспроизводимой конвертации используется:

```sh
npm run optimize:images -- <input> <output> [max-width] [quality]
```

Семь иллюстраций главной лежат как оптимизированные WebP в `assets/` соответствующих widgets и подключаются через `next/image`. Hero имеет размер 1120×1080, шаги — 800×480, режимы — 1200×660, сейф доверия — 800×1040. Вместе файлы весят 105 232 байта. Несжатые PNG-источники и промежуточные варианты не коммитятся; фиктивные кампании не изображаются.
