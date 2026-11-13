import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { shouldEndSession } from "./sessionGuard.ts";

const signedIn = "0x012E40523eAca6BEd2e8205A05eC7e6281dB5Ef5" as const;
const other = "0xAcB3EF35168e5896a9a2bc8b40cDd0628b7DC9c6" as const;

describe("shouldEndSession", () => {
  it("завершает сессию, когда кошелёк переключили на другой аккаунт", () => {
    assert.equal(shouldEndSession({ sessionAddress: signedIn, walletStatus: "connected", walletAddress: other }), true);
  });

  it("сохраняет сессию того же адреса, даже если кошелёк отдал его строчными буквами", () => {
    const lower = signedIn.toLowerCase() as `0x${string}`;
    assert.equal(shouldEndSession({ sessionAddress: signedIn, walletStatus: "connected", walletAddress: lower }), false);
  });

  it("не трогает сессию, пока кошелёк переподключается после загрузки страницы", () => {
    for (const walletStatus of ["reconnecting", "connecting", "disconnected"] as const) {
      assert.equal(shouldEndSession({ sessionAddress: signedIn, walletStatus, walletAddress: undefined }), false, walletStatus);
    }
  });

  it("без сессии завершать нечего", () => {
    assert.equal(shouldEndSession({ sessionAddress: undefined, walletStatus: "connected", walletAddress: other }), false);
  });
});
