# Развёртывания

## Sepolia

### V2 — funding modes

- дата: 28 октября 2026 года;
- source commit: `00abe0eb85be82cac9182c098d8d8272388b172a`;
- chain ID: `11155111`;
- контракт: [`0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A`](https://sepolia.etherscan.io/address/0x68905C4394c10c37b1D3b2f7bB3342EAFF5a077A);
- deployer: [`0xAcB3EF35168e5896a9a2bc8b40cDd0628b7DC9c6`](https://sepolia.etherscan.io/address/0xAcB3EF35168e5896a9a2bc8b40cDd0628b7DC9c6);
- transaction: [`0x671c593b231319826e41628ca6d35ad0e7e86216c517f261493037aa5517839f`](https://sepolia.etherscan.io/tx/0x671c593b231319826e41628ca6d35ad0e7e86216c517f261493037aa5517839f);
- block: `12014545`;
- gas used: `10,517,876`;
- effective gas price: `0.997890626 gwei`;
- стоимость: `0.010495689865830375 ETH`;
- deployed runtime bytecode: 6667 байт, точное совпадение с локальной сборкой;
- Solidity: `0.8.24`;
- EVM target: Cancun;
- Sourcify verification: [`exact_match`](https://sourcify.dev/server/verify-ui/jobs/8b5fdd35-a6e9-4eaf-8e3e-5c93a8694bca).

On-chain-проверка V2 выполнена с deployment-аккаунта:

| Сценарий | Действие | Transaction |
| --- | --- | --- |
| `FixedDeadline`, campaign `0` | создание с целью `0.00001 ETH` и сроком 1 день | [`0x79c8…fe4e`](https://sepolia.etherscan.io/tx/0x79c8fbf0ccacfc607e289397070986642aaf921b0f8f285c2071622a89cbfe4e) |
| `FixedDeadline`, campaign `0` | donation достигает цели до дедлайна | [`0x8ba0…3c67`](https://sepolia.etherscan.io/tx/0x8ba0e3f34bd7d04707b22874853857f69fbe45d687ae298042d5199032923c67) |
| `FixedDeadline`, campaign `0` | немедленный вывод после успеха | [`0x6539…5313`](https://sepolia.etherscan.io/tx/0x6539d752e049097f58c16c5e4126692d7bbeeea83e4145996da6d0ead5145313) |
| `OpenEnded`, campaign `1` | создание с целью `0.00002 ETH` и нулевым дедлайном | [`0xd233…c29e`](https://sepolia.etherscan.io/tx/0xd233f28b2259c0afc0f038dc9d322a8892a526b32486c28f6cfad861e8e6c29e) |
| `OpenEnded`, campaign `1` | частичный donation `0.00001 ETH` | [`0x99bf…8729`](https://sepolia.etherscan.io/tx/0x99bf460507a4b0184f0db32d695f810c1396f8204aa69014e848dfc54d3d8729) |
| `OpenEnded`, campaign `1` | активный refund до достижения цели | [`0x49c2…a168`](https://sepolia.etherscan.io/tx/0x49c22a2d911f768800f2c69f3b87a26fb1973e07617dd3a0cc67475a68e6a168) |
| `OpenEnded`, campaign `1` | новый donation достигает цели после refund | [`0x44a7…2b48`](https://sepolia.etherscan.io/tx/0x44a73eb10b2c608b82b61cb64f97fa6228148252565db41b53b88a59e7862b48) |
| `OpenEnded`, campaign `1` | вывод успешной кампании | [`0xb81f…ddd8`](https://sepolia.etherscan.io/tx/0xb81f222be82abafad435bba5516dd623a44645a811e63b24586ead667130ddd8) |

После сценариев обе кампании имеют статус `Withdrawn`, а баланс контракта равен нулю. Для campaign `1` отдельно подтверждено, что активный refund обнулил вклад и `totalRaised`, сохранив статус `Active`, после чего новый donation снова достиг цели.

### V1 — fixed deadline after expiry

- дата: 27 октября 2026 года;
- chain ID: `11155111`;
- контракт: [`0x480EC361EBDD78465831eb555d3eFcF650D2A217`](https://sepolia.etherscan.io/address/0x480EC361EBDD78465831eb555d3eFcF650D2A217);
- deployer: [`0xAcB3EF35168e5896a9a2bc8b40cDd0628b7DC9c6`](https://sepolia.etherscan.io/address/0xAcB3EF35168e5896a9a2bc8b40cDd0628b7DC9c6);
- transaction: [`0xd1196226fa1b5c71ac03f7f41c49b3156644d58c1f1e0421ddcec87565967bb8`](https://sepolia.etherscan.io/tx/0xd1196226fa1b5c71ac03f7f41c49b3156644d58c1f1e0421ddcec87565967bb8);
- block: `12007244`;
- gas used: `8,887,809`;
- Solidity: `0.8.24`;
- EVM target: Cancun;
- Sourcify verification: [`exact_match`](https://sourcify.dev/server/verify-ui/jobs/79f02551-12d1-4ff9-b23e-cfd6d1f2db00).
