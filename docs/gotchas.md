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
