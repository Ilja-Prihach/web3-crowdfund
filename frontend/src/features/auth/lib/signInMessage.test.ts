import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parseSiweMessage } from "viem/siwe";

import { buildSignInMessage } from "./signInMessage.ts";

const input = {
  // Rabby отдаёт адрес строчными буквами.
  address: "0x012e40523eaca6bed2e8205a05ec7e6281db5ef5" as const,
  nonce: "a".repeat(64),
  origin: "http://localhost:3000",
  issuedAt: new Date("2026-11-12T17:14:17.537Z"),
};

describe("buildSignInMessage", () => {
  it("собирает сообщение EIP-4361 для текущего сайта и Sepolia", () => {
    const parsed = parseSiweMessage(buildSignInMessage(input));

    assert.equal(parsed.domain, "localhost:3000");
    assert.equal(parsed.uri, "http://localhost:3000");
    assert.equal(parsed.chainId, 11_155_111);
    assert.equal(parsed.version, "1");
    assert.equal(parsed.nonce, input.nonce);
    assert.equal(parsed.issuedAt?.toISOString(), "2026-11-12T17:14:17.537Z");
  });

  it("пишет адрес с контрольной суммой EIP-55, даже если кошелёк отдал его строчными буквами", () => {
    assert.equal(parseSiweMessage(buildSignInMessage(input)).address, "0x012E40523eAca6BEd2e8205A05eC7e6281dB5Ef5");
  });

  it("берёт домен вместе с портом и объясняет, что газ не нужен", () => {
    const message = buildSignInMessage({ ...input, origin: "https://openfund.example:8443" });

    assert.ok(message.startsWith("openfund.example:8443 wants you to sign in with your Ethereum account:"));
    assert.match(message, /does not send a transaction and costs no gas/);
  });
});
