# Frontend

Статус: реализация ещё не начата. Frontend строится последовательностью небольших PR согласно [`docs/plans/frontend-mvp.md`](../docs/plans/frontend-mvp.md).

## Принятый стек

- Next.js App Router;
- React и TypeScript;
- SCSS Modules;
- wagmi, viem и TanStack Query для Web3-слоя;
- Ethereum Sepolia и V2-контракт из [`docs/deployments.md`](../docs/deployments.md).

## Архитектурные правила

- `app` собирает маршруты и providers;
- `widgets` содержит крупные секции страниц;
- `features` содержит пользовательские действия;
- `entities` содержит доменное представление кампании;
- `shared` содержит только переиспользуемые UI-примитивы, config, lib, styles и общие assets;
- самостоятельный компонент хранит `ComponentName.tsx` и `ComponentName.module.scss` в одной папке;
- локальные изображения секции лежат в её `assets/`;
- растровые изображения оптимизируются до коммита и подключаются через `next/image`.

Команды запуска и проверки появятся в PR bootstrap и станут канонической частью этого README.
