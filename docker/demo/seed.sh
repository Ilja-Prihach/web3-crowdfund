#!/usr/bin/env bash
set -euo pipefail

rpc=${DEMO_RPC_URL:-http://anvil:8545}
creator=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
backer=0x70997970C51812dc3A010C7d01b50e0d17dc79C8
contract=0x5FbDB2315678afecb367f032d93F642f64180aa3

cd "${DEMO_CONTRACTS_DIR:-/contracts}"
existing=$(cast code "$contract" --rpc-url "$rpc")
if [[ "$existing" != "0x" ]]; then
  count=$(cast call "$contract" 'nextCampaignId()(uint256)' --rpc-url "$rpc")
  count=${count%% *}
  if [[ ! "$count" =~ ^[0-9]+$ || "$count" -lt 5 ]]; then
    echo "Incomplete demo seed. Reset the demo stack before restarting." >&2
    exit 1
  fi
  exit 0
fi
node /compile.cjs
cast send --rpc-url "$rpc" --unlocked --from "$creator" --create "$(cat /tmp/crowdfunding.bytecode)" >/dev/null
[[ $(cast code "$contract" --rpc-url "$rpc") != "0x" ]]

create() {
  cast send --rpc-url "$rpc" --unlocked --from "$creator" "$contract" \
    'createCampaign(string,string,uint256,uint8,uint256)' "$1" "$2" "$3" "$4" "$5" >/dev/null
}
send() {
  cast send --rpc-url "$rpc" --unlocked --from "$creator" "$contract" "$@" >/dev/null
}

create 'Городская мастерская' 'Открываем мастерскую, где соседи смогут чинить вещи и учиться друг у друга.' 1000000000000000000 1 0
create 'Книги для школьной библиотеки' 'Собираем средства на современные книги и встречи с авторами.' 1000000000000000000 0 30
create 'Мобильный сад' 'Создаём передвижной сад для дворов и городских праздников.' 1000000000000000000 1 0
create 'Музыкальная студия' 'Помогаем молодым музыкантам записать первые композиции.' 1000000000000000000 1 0
create 'Общественный кинопоказ' 'Готовим бесплатные показы и обсуждения для жителей района.' 1000000000000000000 0 1
cast send --value 1000000000000000000 --rpc-url "$rpc" --unlocked --from "$backer" "$contract" 'donate(uint256)' 1 >/dev/null
cast send --value 1000000000000000000 --rpc-url "$rpc" --unlocked --from "$backer" "$contract" 'donate(uint256)' 2 >/dev/null
send 'withdrawFunds(uint256)' 2
send 'cancelCampaign(uint256)' 3
cast rpc --rpc-url "$rpc" evm_setNextBlockTimestamp "$(date +%s)" >/dev/null
cast rpc --rpc-url "$rpc" evm_mine >/dev/null
cast rpc --rpc-url "$rpc" anvil_mine 0x40 >/dev/null
