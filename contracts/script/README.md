# Скрипты развёртывания

## Локальное развёртывание

Запустите локальный блокчейн в первом терминале:

```bash
anvil
```

Во втором терминале перейдите в `contracts/` и запустите скрипт:

```bash
forge script script/DeployCrowdfunding.s.sol:DeployCrowdfunding \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --unlocked \
  --sender <ANVIL_ACCOUNT>
```

- `--rpc-url` задаёт адрес локального блокчейна.
- `--broadcast` отправляет транзакцию, а не только симулирует её.
- `--unlocked` использует разблокированный аккаунт Anvil.
- `--sender` задаёт адрес отправителя транзакции.

После успешного развёртывания Forge выведет адрес контракта.

Проверить начальное состояние можно командой:

```bash
cast call <CONTRACT_ADDRESS> \
  "nextCampaignId()(uint256)" \
  --rpc-url http://127.0.0.1:8545
```

> Разблокированные аккаунты Anvil предназначены только для локальной разработки.
> Не используйте их ключи и мнемоническую фразу в реальных сетях.

## Развёртывание в Sepolia

Создайте локальный `.env` из шаблона `.env.example` и укажите `SEPOLIA_RPC_URL`. Файл `.env` игнорируется Git.

Deployment-аккаунт хранится в зашифрованном keystore Foundry:

```bash
cast wallet new crowdfunding-deployer --touch-id
```

Сначала выполните симуляцию без `--broadcast`:

```bash
forge script script/DeployCrowdfunding.s.sol:DeployCrowdfunding --rpc-url sepolia --sender <DEPLOYER_ADDRESS> --gas-estimate-multiplier 900
```

Для отправки deployment-транзакции:

```bash
forge script script/DeployCrowdfunding.s.sol:DeployCrowdfunding --rpc-url sepolia --account crowdfunding-deployer --broadcast --gas-estimate-multiplier 900 -vvvv
```

Для верификации через Sourcify:

```bash
forge verify-contract --chain sepolia <CONTRACT_ADDRESS> src/Crowdfunding.sol:Crowdfunding --verifier sourcify --watch
```

Приватный ключ нельзя передавать через аргументы команды, хранить в `.env` или добавлять в Git.

Значение gas multiplier выбрано для актуальной Sepolia, где стоимость deployment отличается от локальной Cancun-симуляции. Перед будущим развёртыванием оценку нужно проверить повторно.
