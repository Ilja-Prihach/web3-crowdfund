import assert from "node:assert/strict";
import { after, beforeEach, describe, it } from "node:test";

import { type Address, encodeFunctionData, keccak256, serializeErc6492Signature, toHex } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";

import { createChainClient } from "../../chain/client.ts";
import { testDeps } from "../../test/app.ts";
import { anvilAccounts, useAnvil } from "../../test/anvil.ts";
import { signedSignIn, verify } from "../../test/auth.ts";
import { deployContract, readArtifact } from "../../test/crowdfunding.ts";
import { createTestDatabase, resetTestDatabase } from "../../test/database.ts";

const { db, pool } = createTestDatabase();
after(() => pool.end());
beforeEach(() => resetTestDatabase(db));

const [deployer] = anvilAccounts;
// Владелец смарт-кошелька — одноразовый ключ: кошелёк проверяет его подпись через ERC-1271.
const owner = privateKeyToAccount(generatePrivateKey());
const salt = (label: string) => keccak256(toHex(label));

// Узел Anvil с chain ID Sepolia, фабрикой кошельков и одним уже развёрнутым кошельком.
const stand = useAnvil(async ({ client }) => {
  const { abi: factoryAbi } = await readArtifact("TestSmartWallet.sol", "TestSmartWalletFactory");
  const factory = await deployContract(client, deployer, "TestSmartWallet.sol", "TestSmartWalletFactory");
  const predict = (label: string) =>
    client.readContract({
      address: factory,
      abi: factoryAbi,
      functionName: "predict",
      args: [owner.address, salt(label)],
    }) as Promise<Address>;

  const hash = await client.writeContract({
    address: factory,
    abi: factoryAbi,
    account: deployer,
    chain: client.chain,
    functionName: "deploy",
    args: [owner.address, salt("deployed")],
  });
  await client.waitForTransactionReceipt({ hash });

  return {
    factory,
    factoryAbi,
    deployedWallet: await predict("deployed"),
    counterfactualWallet: await predict("counterfactual"),
  };
});

// Подпись ERC-6492: кошелька ещё нет, поэтому к подписи владельца приложено, как его развернуть.
function wrapCounterfactual(signature: `0x${string}`) {
  const { factory, factoryAbi } = stand.context;
  return serializeErc6492Signature({
    address: factory,
    data: encodeFunctionData({ abi: factoryAbi, functionName: "deploy", args: [owner.address, salt("counterfactual")] }),
    signature,
  });
}

// Проверка подписи идёт через тот же клиент, что в приложении, только к локальному узлу.
const anvilDeps = () => testDeps(db, { chain: createChainClient(stand.anvil.url) });

describe("вход смарт-кошельком на Anvil", () => {
  it("принимает развёрнутый кошелёк ERC-1271: подпись владельца, адрес кошелька", async () => {
    const { deployedWallet } = stand.context;
    assert.ok(await stand.anvil.client.getCode({ address: deployedWallet }), "кошелёк развёрнут");

    const signed = await signedSignIn(db, { address: deployedWallet }, owner);
    const response = await verify(db, signed, anvilDeps());

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ address: string }>().address, deployedWallet);
  });

  it("принимает неразвёрнутый кошелёк ERC-6492: подпись несёт фабрику и calldata развёртывания", async () => {
    const { counterfactualWallet } = stand.context;
    assert.equal(await stand.anvil.client.getCode({ address: counterfactualWallet }), undefined, "кошелька ещё нет");

    const signed = await signedSignIn(db, { address: counterfactualWallet }, owner);
    const signature = wrapCounterfactual(signed.signature);
    const response = await verify(db, { message: signed.message, signature }, anvilDeps());

    assert.equal(response.statusCode, 200);
    assert.equal(response.json<{ address: string }>().address, counterfactualWallet);
    // Проверка — симуляция в eth_call: вход не разворачивает кошелёк и ничего не пишет в сеть.
    assert.equal(await stand.anvil.client.getCode({ address: counterfactualWallet }), undefined);
  });

  it("отклоняет подпись не владельца для развёрнутого и неразвёрнутого кошелька", async () => {
    const { deployedWallet, counterfactualWallet } = stand.context;
    const stranger = privateKeyToAccount(generatePrivateKey());

    const deployed = await signedSignIn(db, { address: deployedWallet }, stranger);
    assert.equal((await verify(db, deployed, anvilDeps())).statusCode, 401, "ERC-1271");

    const counterfactual = await signedSignIn(db, { address: counterfactualWallet }, stranger);
    const signature = wrapCounterfactual(counterfactual.signature);
    assert.equal((await verify(db, { message: counterfactual.message, signature }, anvilDeps())).statusCode, 401, "ERC-6492");
  });
});
