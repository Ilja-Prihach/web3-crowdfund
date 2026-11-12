import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { createSiweMessage, type SiweMessage } from "viem/siwe";

import { buildApp } from "../app.ts";
import type { Database } from "../db/client.ts";
import { testAppOrigin, testDeps } from "./app.ts";

export async function requestNonce(db: Database) {
  const app = buildApp(testDeps(db));
  const response = await app.inject({ method: "POST", url: "/v1/auth/nonce" });
  await app.close();
  return response;
}

// Сообщение, которое собрал бы frontend для одноразового ключа; поля можно испортить через overrides.
export async function signedSignIn(
  db: Database,
  overrides: Partial<SiweMessage> = {},
  signer = privateKeyToAccount(generatePrivateKey()),
) {
  const { nonce } = (await requestNonce(db)).json<{ nonce: string }>();
  const message = createSiweMessage({
    address: signer.address,
    chainId: 11_155_111,
    domain: new URL(testAppOrigin).host,
    nonce,
    uri: testAppOrigin,
    version: "1",
    issuedAt: new Date(),
    statement: "Sign in to OpenFund",
    ...overrides,
  });
  return { message, signature: await signer.signMessage({ message }), address: signer.address, nonce };
}

export async function verify(db: Database, body: { message: string; signature: string }, deps = testDeps(db)) {
  const app = buildApp(deps);
  const response = await app.inject({ method: "POST", url: "/v1/auth/verify", payload: body });
  await app.close();
  return response;
}

// Полный вход одноразовым ключом: возвращает адрес и значение cookie сессии.
export async function signInForCookie(db: Database) {
  const signed = await signedSignIn(db);
  const response = await verify(db, signed);
  const cookie = response.cookies.find((item) => item.name === "openfund_session");
  if (response.statusCode !== 200 || !cookie) throw new Error(`sign-in failed: ${response.statusCode}`);
  return { address: signed.address, sessionId: cookie.value };
}
