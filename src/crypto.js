/* Web Crypto helpers. No Node.js APIs, so this runs on Workers Free. */

const encoder = new TextEncoder();

// Cloudflare Workers rejects PBKDF2 iteration counts above 100,000.
export const PASSWORD_ITERATIONS = 100_000;
export const PASSWORD_KEY_BYTES = 32;

export function toBase64(bytes) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < view.length; i += chunk) {
    binary += String.fromCharCode(...view.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export function fromBase64(value) {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function toBase64Url(bytes) {
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomBytes(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

export function randomToken(length = 32) {
  return toBase64Url(randomBytes(length));
}

export function randomId() {
  return crypto.randomUUID();
}

export async function sha256Hex(value) {
  const data = typeof value === "string" ? encoder.encode(value) : value;
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqual(a, b) {
  const left = typeof a === "string" ? encoder.encode(a) : a;
  const right = typeof b === "string" ? encoder.encode(b) : b;
  if (!left || !right || left.length !== right.length) return false;
  let diff = 0;
  for (let i = 0; i < left.length; i += 1) diff |= left[i] ^ right[i];
  return diff === 0;
}

export async function hashPassword(password, saltBase64, iterations = PASSWORD_ITERATIONS) {
  const salt = fromBase64(saltBase64);
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    key,
    PASSWORD_KEY_BYTES * 8
  );
  return toBase64(bits);
}

export async function verifyPassword(password, saltBase64, iterations, expectedHash) {
  const hash = await hashPassword(password, saltBase64, iterations);
  return timingSafeEqual(hash, expectedHash);
}

export function newSalt() {
  return toBase64(randomBytes(16));
}

export function passwordProblem(password, email = "", name = "") {
  const value = String(password || "");
  if (value.length < 12) return "Password must be at least 12 characters.";
  if (value.length > 128) return "Password must be at most 128 characters.";
  const lower = value.toLowerCase();
  if (email && lower.includes(String(email).toLowerCase())) return "Password must not contain your email.";
  if (name && name.length > 2 && lower.includes(String(name).toLowerCase())) return "Password must not contain your name.";
  return "";
}
