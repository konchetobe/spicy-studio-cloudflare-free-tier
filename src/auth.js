import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { HttpError } from "./errors.js";
import {
  createSession as insertSession,
  deleteSession,
  getSession,
  getUserById,
  touchUser,
} from "./db.js";
import { randomToken, sha256Hex, timingSafeEqual } from "./crypto.js";

export const SESSION_DAYS = 7;
const SESSION_MS = SESSION_DAYS * 24 * 60 * 60 * 1000;

function cookieName(c) {
  return new URL(c.req.url).protocol === "https:" ? "__Host-ss_session" : "ss_session";
}

function cookieOptions(c) {
  return {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === "https:",
    sameSite: "Lax",
    path: "/",
  };
}

export function publicUser(row) {
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    status: row.status,
    createdAt: Number(row.created_at || 0),
    lastLoginAt: row.last_login_at ? Number(row.last_login_at) : null,
  };
}

export function requestMeta(c) {
  return {
    ip: c.req.header("cf-connecting-ip") || "local",
    userAgent: (c.req.header("user-agent") || "").slice(0, 300),
  };
}

export async function createSession(c, user) {
  const token = randomToken(32);
  const csrf = randomToken(32);
  const id = await sha256Hex(token);
  const createdAt = Date.now();
  const expiresAt = createdAt + SESSION_MS;
  const meta = requestMeta(c);
  await insertSession(c.env.DB, {
    id,
    userId: user.id,
    csrf,
    sessionVersion: Number(user.session_version || 1),
    createdAt,
    expiresAt,
    ip: meta.ip,
    userAgent: meta.userAgent,
  });
  setCookie(c, cookieName(c), token, { ...cookieOptions(c), maxAge: Math.floor(SESSION_MS / 1000) });
  return { token, csrf, expiresAt };
}

export function setSessionCookie(c, token, expiresAt) {
  const maxAge = Math.max(1, Math.floor((Number(expiresAt) - Date.now()) / 1000));
  setCookie(c, cookieName(c), token, { ...cookieOptions(c), maxAge });
}


export async function clearSession(c) {
  const name = cookieName(c);
  const token = getCookie(c, name);
  if (token) {
    const id = await sha256Hex(token);
    await deleteSession(c.env.DB, id);
  }
  deleteCookie(c, name, cookieOptions(c));
}

export async function readSession(c) {
  const name = cookieName(c);
  const token = getCookie(c, name);
  if (!token) return null;
  const id = await sha256Hex(token);
  const session = await getSession(c.env.DB, id);
  if (!session) return null;
  if (Number(session.expires_at) <= Date.now()) {
    await deleteSession(c.env.DB, id);
    return null;
  }
  const user = await getUserById(c.env.DB, session.user_id);
  if (!user || user.status !== "active") return null;
  if (Number(session.session_version) !== Number(user.session_version || 1)) return null;
  await touchUser(c.env.DB, user.id);
  return {
    user,
    session: {
      id: session.id,
      csrf: session.csrf,
      expiresAt: Number(session.expires_at),
    },
  };
}

export async function requireUser(c, next) {
  const auth = await readSession(c);
  if (!auth) throw new HttpError(401, "Sign in required.");
  c.set("user", auth.user);
  c.set("session", auth.session);
  await next();
}

export async function requireAdmin(c, next) {
  const auth = await readSession(c);
  if (!auth) throw new HttpError(401, "Sign in required.");
  if (auth.user.role !== "admin") throw new HttpError(403, "Admin access required.");
  c.set("user", auth.user);
  c.set("session", auth.session);
  await next();
}

export async function sameOrigin(c, next) {
  const origin = c.req.header("origin");
  if (origin) {
    const expected = c.env.APP_ORIGIN || new URL(c.req.url).origin;
    if (origin !== expected) throw new HttpError(403, "Cross-origin request blocked.");
  }
  await next();
}

export async function csrf(c, next) {
  const origin = c.req.header("origin");
  if (origin) {
    const expected = c.env.APP_ORIGIN || new URL(c.req.url).origin;
    if (origin !== expected) throw new HttpError(403, "Cross-origin request blocked.");
  }
  const session = c.get("session");
  const token = c.req.header("x-csrf-token") || "";
  if (!session || !timingSafeEqual(token, session.csrf)) {
    throw new HttpError(403, "Invalid CSRF token.");
  }
  await next();
}

export function authResponse(user, session) {
  return {
    user: publicUser(user),
    csrf: session.csrf,
    expiresAt: session.expiresAt,
  };
}
