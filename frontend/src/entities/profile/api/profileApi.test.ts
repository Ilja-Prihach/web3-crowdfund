import assert from "node:assert/strict";
import { afterEach, it } from "node:test";

import { BackendApiError } from "../../../shared/api/backend.ts";
import { fetchProfile, fromProfileJson, parseProfileAddress, saveProfile } from "./profileApi.ts";
import { validateProfileDraft } from "../../../features/profile-edit/lib/profileDraft.ts";

const address = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
const fixture = { address, name: "Автор", bio: null, createdAt: "2026-11-23T12:00:00Z", updatedAt: "2026-11-23T12:00:00Z" };
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

it("адрес профиля принимает только 20-байтовый hex, независимо от регистра", () => {
  assert.ok(parseProfileAddress(address));
  assert.ok(parseProfileAddress(`0x${"A".repeat(40)}`));
  for (const value of ["abc", "0x1", "", `0x${"a".repeat(41)}`]) assert.equal(parseProfileAddress(value), null);
});
it("ответ профиля проверяет адрес, даты и тип текста", () => {
  assert.ok(fromProfileJson(fixture).createdAt instanceof Date);
  for (const value of [null, { ...fixture, address: "bad" }, { ...fixture, name: 1 }, { ...fixture, updatedAt: "bad" }]) {
    assert.throws(() => fromProfileJson(value), BackendApiError);
  }
});
it("только PROFILE_NOT_FOUND означает незаполненный профиль", async () => {
  globalThis.fetch = async () => Response.json({ error: { code: "PROFILE_NOT_FOUND" } }, { status: 404 });
  assert.equal(await fetchProfile(address), null);
  globalThis.fetch = async () => Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  await assert.rejects(fetchProfile(address), BackendApiError);
});
it("чужой профиль в успешном ответе отклоняется", async () => {
  globalThis.fetch = async () => Response.json({ ...fixture, address: `0x${"b".repeat(40)}` });
  await assert.rejects(fetchProfile(address), BackendApiError);
});
it("PUT передаёт редактируемые поля и ожидаемого владельца формы", async () => {
  globalThis.fetch = async (url, init) => {
    assert.equal(url, "/api/v1/profiles/me");
    assert.equal(init?.method, "PUT");
    assert.deepEqual(JSON.parse(String(init?.body)), { name: "Автор", bio: null, expectedAddress: address });
    return Response.json(fixture);
  };
  assert.equal((await saveProfile(address, { name: "Автор", bio: null })).name, "Автор");
});
it("черновик нормализует пустые поля, проверяет лимиты и NUL", () => {
  assert.deepEqual(validateProfileDraft(" ", " ").input, { name: null, bio: null });
  assert.equal(validateProfileDraft("x".repeat(80), "x".repeat(1000)).error, null);
  for (const [name, bio] of [["x".repeat(81), ""], ["", "x".repeat(1001)], ["a\u0000b", ""]]) {
    assert.ok(validateProfileDraft(name, bio).error);
  }
});
