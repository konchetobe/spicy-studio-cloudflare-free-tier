import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, newSalt, PASSWORD_ITERATIONS, toBase64, verifyPassword } from "../src/crypto.js";
import { decryptSecret, encryptSecret } from "../src/keys.js";

const master = toBase64(crypto.getRandomValues(new Uint8Array(32)));

test("password hashing verifies the right password and rejects the wrong one", async () => {
  const salt = newSalt();
  const hash = await hashPassword("correct horse battery staple", salt, 1000);
  assert.equal(await verifyPassword("correct horse battery staple", salt, 1000, hash), true);
  assert.equal(await verifyPassword("wrong password", salt, 1000, hash), false);
});

test("default iteration count fits the Workers PBKDF2 limit", () => {
  assert.ok(PASSWORD_ITERATIONS >= 100_000);
  assert.ok(PASSWORD_ITERATIONS <= 100_000);
});

test("user secret encryption round-trips and is bound to the user", async () => {
  const encrypted = await encryptSecret(master, "user-a", "spicy", "apikey-test-value");
  const row = { ciphertext: encrypted.ciphertext, iv: encrypted.iv };
  assert.equal(await decryptSecret(master, "user-a", "spicy", row), "apikey-test-value");
  await assert.rejects(() => decryptSecret(master, "user-b", "spicy", row));
});

test("user secret encryption is bound to the provider", async () => {
  const encrypted = await encryptSecret(master, "user-a", "spicy", "apikey-test-value");
  const row = { ciphertext: encrypted.ciphertext, iv: encrypted.iv };
  await assert.rejects(() => decryptSecret(master, "user-a", "runware", row));
});
