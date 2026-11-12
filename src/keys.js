import { fromBase64, toBase64 } from "./crypto.js";

const encoder = new TextEncoder();

function masterBytes(secret) {
  const bytes = fromBase64(secret || "");
  if (bytes.length !== 32) {
    throw new Error("KEY_ENCRYPTION_SECRET must be a base64-encoded 32-byte value.");
  }
  return bytes;
}

async function keyFor(secret, userId) {
  const base = await crypto.subtle.importKey("raw", masterBytes(secret), "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: encoder.encode(userId),
      info: encoder.encode("spicy-studio:user-secret:v1"),
    },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptSecret(secret, userId, provider, value) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await keyFor(secret, userId);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: encoder.encode(`${userId}:${provider}`) },
    key,
    encoder.encode(value)
  );
  return { ciphertext: toBase64(ciphertext), iv: toBase64(iv), keyVersion: 1 };
}

export async function decryptSecret(secret, userId, provider, row) {
  if (!row?.ciphertext || !row?.iv) throw new Error("Stored key is missing.");
  const key = await keyFor(secret, userId);
  const plaintext = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: fromBase64(row.iv),
      additionalData: encoder.encode(`${userId}:${provider}`),
    },
    key,
    fromBase64(row.ciphertext)
  );
  return new TextDecoder().decode(plaintext);
}

export function last4(value) {
  const text = String(value || "");
  return text.length <= 4 ? "••••" : text.slice(-4);
}
