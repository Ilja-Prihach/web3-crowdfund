# Подтверждённые грабли

Здесь записаны проблемы, которые уже воспроизводились в этом проекте. Каждая карточка содержит симптом, причину и безопасный способ проверки или восстановления.

## Указатель

| Карточка | Кратко |
| --- | --- |
| [sepolia-deployment-gas-differs-from-local-simulation](#sepolia-deployment-gas-differs-from-local-simulation) | Актуальная Sepolia требует намного больше deployment gas, чем локальная Cancun-симуляция |
| [failed-transaction-consumes-gas-and-nonce](#failed-transaction-consumes-gas-and-nonce) | Failed deployment тратит ETH и меняет следующий адрес контракта |
| [shell-backslash-must-be-last](#shell-backslash-must-be-last) | Пробел после `\` разбивает одну команду на несколько |
| [forge-format-must-skip-dependencies](#forge-format-must-skip-dependencies) | Formatter всего дерева проверяет vendored libraries |
| [mapping-is-not-iterable](#mapping-is-not-iterable) | Получить список ключей `mapping` напрямую нельзя |
| [frontend-major-versions-must-match-tooling](#frontend-major-versions-must-match-tooling) | Новейшие major-версии TypeScript и ESLint могут опережать поддержку Next.js tooling |
| [wagmi-restored-session-is-reconnecting](#wagmi-restored-session-is-reconnecting) | Сессия из cookie приходит в статусе `reconnecting`, а не `connected` |
| [git-add-directory-captures-parallel-edits](#git-add-directory-captures-parallel-edits) | `git add` целой папки забирает чужие незакоммиченные правки |
| [viem-default-sepolia-rpc-is-rate-limited](#viem-default-sepolia-rpc-is-rate-limited) | Публичный Sepolia RPC из viem отвечает `429`, и каталог зависает на загрузке |
| [node-test-does-not-resolve-path-alias](#node-test-does-not-resolve-path-alias) | `node --test` не понимает псевдоним `@/` из `tsconfig.json` |
| [tsc-incremental-cache-keeps-stale-errors](#tsc-incremental-cache-keeps-stale-errors) | После смены `target` typecheck показывает старую ошибку из кэша |
| [zsh-does-not-split-unquoted-variables](#zsh-does-not-split-unquoted-variables) | В zsh `$pair` остаётся одним аргументом, и `cast` получает пустые параметры |
| [wallet-uses-its-own-sepolia-rpc](#wallet-uses-its-own-sepolia-rpc) | Кошелёк отправляет транзакции через свой RPC и может упереться в `429`, хотя сайт работает |
| [public-rpc-prunes-log-history](#public-rpc-prunes-log-history) | Публичные Sepolia RPC не отдают логи с блока deploy V2, поэтому indexer не может прочитать историю |

## Карточки

### sepolia-deployment-gas-differs-from-local-simulation

**Симптом.** `forge script` успешно симулирует deployment, но on-chain-транзакция заканчивается `OutOfGas` и использует ровно весь gas limit.

**Подтверждённые случаи.** Для V1 локальная симуляция оценивала создание `Crowdfunding` примерно в 1.27 млн gas, Sepolia RPC вернул `eth_estimateGas = 8,959,514`, а успешная транзакция использовала `8,887,809` gas. Для V2 локальная симуляция оценила создание примерно в 1.49 млн gas, RPC вернул `10,602,518`, а успешная транзакция использовала `10,517,876` gas. Повторяемая разница согласуется с тестируемым repricing стоимости нового состояния и code deposit.

**Правило.** Перед публичным deployment проверяйте bytecode через RPC сети, а не полагайтесь только на локальный multiplier:

```bash
cast estimate --from <DEPLOYER_ADDRESS> --rpc-url sepolia --create "$(forge inspect src/Crowdfunding.sol:Crowdfunding bytecode)"
```

Установленный gas limit должен быть выше RPC estimate и ниже действующего сетевого лимита. Текущие цифры нельзя без проверки переносить на будущую сеть или версию контракта.

Доказательства:

- [первая failed-транзакция](https://sepolia.etherscan.io/tx/0x0fda6fa728670b400641d93d89facc206472d6f9700a4b7a14d2b82106a57c64);
- [вторая failed-транзакция](https://sepolia.etherscan.io/tx/0xc3f0f5e3fae129496fa60792539b80e3e6eebc3d23da379325d60bff6bf71580);
- успешный адрес и deployment-транзакция — в [`deployments.md`](deployments.md).

Описание repricing: [EIP-8007](https://eips.ethereum.org/EIPS/eip-8007).

### failed-transaction-consumes-gas-and-nonce

**Симптом.** После failed deployment баланс уменьшился, а следующая симуляция показала другой адрес контракта.

**Причина.** Включённая в блок транзакция платит за выполненную EVM-работу и увеличивает nonce отправителя даже при `status = 0`. Адрес обычного `CREATE` зависит от адреса отправителя и nonce.

**Правило.** После ошибки сначала прочитайте receipt и убедитесь в причине. Не повторяйте `--broadcast` вслепую и не считайте адрес из неудачной симуляции окончательным.

### shell-backslash-must-be-last

**Симптом.** `zsh` пишет `command not found` для каждого флага, а Foundry получает пустой или повреждённый аргумент.

**Причина.** В shell символ `\` продолжает команду только тогда, когда является последним символом строки. Пробел после него отменяет перенос.

**Правило.** Для учебных команд предпочитайте одну копируемую строку. Если команда многострочная, после `\` не должно быть пробелов или комментария.

### forge-format-must-skip-dependencies

**Симптом.** `forge fmt --check` показывает тысячи изменений внутри `contracts/lib/openzeppelin-contracts`, хотя файлы проекта отформатированы.

**Причина.** Проверка без путей захватывает vendored dependency с другим форматированием.

**Правило.** Проверяйте только каталоги проекта:

```bash
forge fmt --check src test script
```

Не форматируйте `lib/` и не коммитьте механические изменения зависимостей.

### mapping-is-not-iterable

**Симптом.** Public getter возвращает значение по известному ключу, но не предоставляет список всех campaign ID.

**Причина.** Solidity `mapping` не хранит перечислимый массив ключей.

**Правило.** Для кампаний используется последовательный `nextCampaignId` и ограниченная функция `getCampaigns(offset, limit)`. Не добавляйте неограниченный возврат всех кампаний.

Связано: [`DECISIONS.md#pagination-is-bounded`](DECISIONS.md#pagination-is-bounded).

### frontend-major-versions-must-match-tooling

**Симптом.** На bootstrap установка последних major-версий завершалась, но ESLint падал с сообщением `typescript-eslint does not support TS 7.0`, а плагины из `eslint-config-next` объявляли peer range только до ESLint 9.

**Причина.** Компилятор TypeScript, ESLint core и плагины Next.js выпускаются независимо. Максимально новая версия каждого пакета не гарантирует совместимость всего набора.

**Правило.** Используйте точные версии из `frontend/package.json` и устанавливайте их через `npm ci`. Major-обновления TypeScript и ESLint выполняйте отдельным PR только после проверки peer ranges, `npm run lint`, `npm run typecheck` и `npm run build`; не подавляйте конфликт через `--force`.

### wagmi-restored-session-is-reconnecting

**Симптом.** Кошелёк был подключён, cookie wagmi на месте, но после перезагрузки страницы сервер рендерит кнопку «Подключить кошелёк», а адрес появляется только через одну-две секунды.

**Причина.** Состояние из `cookieToInitialState` восстанавливается со статусом `reconnecting`: адрес уже известен, но wagmi ещё ждёт от кошелька подтверждения разрешения. Код, проверявший `connection.status === "connected"`, считал такую сессию отключённой и на сервере, и в браузере.

**Правило.** Показывать кошелёк по наличию адреса (`connection.address`), а не по статусу `connected`. Проверка: подключить кошелёк, перезагрузить страницу и убедиться, что HTML ответа сервера уже содержит меню адреса (`aria-controls="wallet-menu"`).

### git-add-directory-captures-parallel-edits

**Симптом.** Коммит с описанием одной задачи содержит чужие изменения: при работе агента в PR 4 в коммит меню кошелька попал параллельный редизайн окна подключения вместе с новым изображением.

**Причина.** `git add <папка>` индексирует все изменённые и новые файлы в ней, включая правки, которые в это время вносил другой участник.

**Правило.** Добавлять в индекс файлы по именам и смотреть `git diff --cached --stat` перед коммитом. Если лишнее уже попало в незапушенный коммит, его разделяют через `git reset --soft` и сверяют итоговое дерево с исходным через `git diff`.

### viem-default-sepolia-rpc-is-rate-limited

**Симптом.** Без `NEXT_PUBLIC_SEPOLIA_RPC_URL` каталог `/campaigns` дольше 6 секунд показывает скелетон, затем ошибку чтения. 31 октября 2026 года `https://11155111.rpc.thirdweb.com` трижды подряд ответил `429 Too Many Requests` на первый же `eth_call`, а `https://ethereum-sepolia-rpc.publicnode.com` на тот же запрос вернул `nextCampaignId = 2`.

**Причина.** `http()` без URL берёт `sepolia.rpcUrls.default` из `viem/chains`. Этот публичный узел ограничивает запросы без ключа, а TanStack Query повторяет упавший запрос три раза с растущей паузой, поэтому ошибка проявляется не сразу.

**Правило.** RPC по умолчанию задаётся явно в `frontend/src/shared/config/web3.ts`, а не берётся из `viem/chains`. Проверка узла перед заменой:

```bash
curl -s -X POST <RPC_URL> -H 'content-type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"eth_call","params":[{"to":"0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A","data":"0x7903a756"},"latest"]}'
```

`0x7903a756` — селектор `nextCampaignId()`; ответ должен содержать `result`, а не HTTP `429`.

### node-test-does-not-resolve-path-alias

**Симптом.** `npm test` падает с `ERR_MODULE_NOT_FOUND: Cannot find package '@/shared'`, хотя `npm run typecheck` и `next build` проходят.

**Причина.** Псевдоним `@/*` из `paths` в `tsconfig.json` понимают TypeScript и сборщик Next.js. `node --test` выполняет `.ts` через type stripping и разрешает импорты по правилам Node, без `tsconfig.json`.

**Правило.** Модуль, который загружают unit-тесты, импортирует соседние модули относительным путём с расширением `.ts` (например, `entities/campaign/lib/deadline.ts`). Импорты только типов (`import type`) удаляются при запуске и могут использовать `@/`. Проверка: `npm test`.

### tsc-incremental-cache-keeps-stale-errors

**Симптом.** После замены `"target": "ES2017"` на `"ES2020"` команда `npm run typecheck` продолжает выводить `TS2737: BigInt literals are not available when targeting lower than ES2020`, а `npx tsc --noEmit --incremental false` проходит без ошибок.

**Причина.** В `frontend/tsconfig.json` включён `"incremental": true`; `tsconfig.tsbuildinfo` сохранил результат прошлой проверки и не был пересчитан после смены опции.

**Правило.** Если typecheck противоречит только что изменённому `tsconfig.json`, сначала сравнить с `npx tsc --noEmit --incremental false`. Файл `frontend/tsconfig.tsbuildinfo` — игнорируемый Git кэш, его можно удалить; следующий запуск создаст его заново.

### zsh-does-not-split-unquoted-variables

**Симптом.** Цикл `for pair in "2 0.004ether" …; do set -- $pair; cast send … "donate(uint256)" $1 --value $2 …; done` завершается `error: a value is required for '--value <VALUE>' but none was supplied`; транзакции не отправляются.

**Причина.** Shell по умолчанию в macOS — zsh. В отличие от bash, zsh не разбивает значение переменной без кавычек на слова, поэтому `$pair` остаётся одним аргументом, `$1` получает всю строку, а `$2` пуст.

**Правило.** Для повторяющихся `cast send` писать команды явно или читать параметры из файла с разделителем через `while IFS=$'\t' read -r …`. Перед отправкой денежных транзакций проверять подставленные значения выводом `echo`. Проверка: после цикла сверить `cast balance` deployer и состояние кампаний через `cast call`.

### wallet-uses-its-own-sepolia-rpc

**Симптом.** 1 ноября 2026 года при вкладе через Rabby появилась ошибка `HTTP request failed. Status: 429 URL: https://11155111.rpc.thirdweb.com/` с телом `eth_getTransactionCount` и подписью `Version: viem@2.47.6`, хотя каталог и страница кампании читались без ошибок.

**Причина.** Сайт читает Sepolia через свой RPC (`ethereum-sepolia-rpc.publicnode.com`), но подписанную транзакцию отправляет кошелёк — через RPC, настроенный в самом кошельке. Rabby для Sepolia по умолчанию использует тот же публичный узел thirdweb, который ограничивает запросы, см. [`viem-default-sepolia-rpc-is-rate-limited`](#viem-default-sepolia-rpc-is-rate-limited). Ошибка пришла не из проекта: в `frontend/node_modules` единственная копия viem версии 2.57.13, а thirdweb в коде не используется.

**Правило.** При ошибке отправки сначала смотреть URL и версию библиотеки в тексте ошибки, чтобы понять, чей это RPC. Для кошелька — задать свой RPC Sepolia в его настройках (в Rabby: Settings → Custom RPC → Sepolia → `https://ethereum-sepolia-rpc.publicnode.com`). Проверка: `cd frontend && npm ls viem` показывает версию проекта, отличную от версии в ошибке. После замены RPC Sepolia в Rabby вклад и создание кампании 2 ноября 2026 года прошли без ошибок, см. [`deployments.md`](deployments.md#демо-кампании-каталога).

### public-rpc-prunes-log-history

**Симптом.** 3 ноября 2026 года `eth_getLogs` по адресу V2 с блока deploy `12014545` на `https://ethereum-sepolia-rpc.publicnode.com` вернул `error code 4444: pruned history unavailable`, хотя запросы по последним блокам работали.

**Причина.** Публичный узел хранит только недавнюю историю: двоичный поиск границы показал около 19 800 последних блоков, это примерно 2,7 дня. Другие бесплатные узлы в тот же день тоже не подошли для полной истории: `sepolia.drpc.org` ограничивает диапазон блоков на бесплатном тарифе, `1rpc.io/sepolia` — 50 блоками за запрос, `rpc.sepolia.org` ответил `522`, а Blast API закрыт. `https://sepolia.gateway.tenderly.co` вернул все 25 событий контракта одним запросом на 45 000 блоков. Frontend это не затрагивает: он читает текущее состояние контракта, а не логи.

**Правило.** Indexer получает RPC из серверной переменной окружения backend и перед первым запуском проверяет, что узел отдаёт логи с блока deploy. Ключ платного или бесплатного провайдера с полной историей допустим только в backend и не попадает в `NEXT_PUBLIC_*`. Проверка:

```bash
cast rpc eth_getLogs '{"address":"0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A","fromBlock":"0xb753d1","toBlock":"0xb7f511"}' --rpc-url "$SEPOLIA_RPC_URL"
```

Ответ — массив событий, а не ошибка `4444`. `0xb753d1` — блок deploy `12014545`.

Связано: [`DECISIONS.md#indexer-reads-finalized-logs`](DECISIONS.md#indexer-reads-finalized-logs).
