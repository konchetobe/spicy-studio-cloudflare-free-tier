import { HttpError } from "../errors.js";
import {
  PASSWORD_ITERATIONS,
  hashPassword,
  newSalt,
  passwordProblem,
  randomToken,
  sha256Hex,
  timingSafeEqual,
  verifyPassword,
} from "../crypto.js";
import {
  audit,
  countUsers,
  createUser,
  createSession,
  deleteUserSessions,
  getInviteByHash,
  getPasswordResetByHash,
  getUserByEmail,
  getUserById,
  markInviteUsed,
  markPasswordResetUsed,
  updateLastLogin,
  updateUserPassword,
  createPasswordReset,
} from "../db.js";

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_USERS = 10;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const DUMMY_SALT = "AAAAAAAAAAAAAAAAAAAAAA==";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

function normalizeEmail(value) {
  const email = String(value || "").trim().toLowerCase();
  if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, "Enter a valid email address.", "email");
  return email;
}

function normalizeName(value) {
  const name = String(value || "").trim();
  if (name.length < 2 || name.length > 80) throw new HttpError(400, "Name must be 2–80 characters.", "name");
  return name;
}

function checkPassword(password, email, name) {
  const problem = passwordProblem(password, email, name);
  if (problem) throw new HttpError(400, problem, "password");
}

async function makeSession(env, user, meta = {}) {
  const token = randomToken(32);
  const csrf = randomToken(32);
  const id = await sha256Hex(token);
  const createdAt = Date.now();
  const expiresAt = createdAt + SESSION_MS;
  await createSession(env.DB, {
    id,
    userId: user.id,
    csrf,
    sessionVersion: Number(user.session_version || 1),
    createdAt,
    expiresAt,
    ip: meta.ip || "",
    userAgent: meta.userAgent || "",
  });
  return { token, csrf, expiresAt };
}

function userPayload(user) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    status: user.status,
    createdAt: Number(user.created_at || 0),
    lastLoginAt: user.last_login_at ? Number(user.last_login_at) : null,
  };
}

async function setup(env, body) {
  if (!env.SETUP_TOKEN) throw new HttpError(503, "Setup is disabled: SETUP_TOKEN is not configured.");
  if (!timingSafeEqual(String(body.setupToken || ""), String(env.SETUP_TOKEN))) {
    throw new HttpError(403, "Invalid setup token.", "setupToken");
  }
  if ((await countUsers(env.DB)) > 0) {
    throw new HttpError(409, "Setup is already complete. Sign in instead.");
  }
  const email = normalizeEmail(body.email);
  const name = normalizeName(body.name);
  checkPassword(body.password, email, name);
  const salt = newSalt();
  const hash = await hashPassword(body.password, salt, PASSWORD_ITERATIONS);
  let user;
  try {
    user = await createUser(env.DB, {
      id: crypto.randomUUID(),
      email,
      name,
      role: "admin",
      status: "active",
      passwordHash: hash,
      passwordSalt: salt,
      passwordIterations: PASSWORD_ITERATIONS,
      sessionVersion: 1,
      lastLoginAt: Date.now(),
    });
  } catch (error) {
    if (/unique|constraint/i.test(error.message)) {
      throw new HttpError(409, "An account with that email already exists.");
    }
    throw error;
  }
  await audit(env.DB, user.id, "setup.admin", user.id, { email });
  const session = await makeSession(env, user, body.meta);
  return { user: userPayload(user), session };
}

async function login(env, body) {
  const email = normalizeEmail(body.email);
  const password = String(body.password || "");
  if (password.length > 512) throw new HttpError(401, "Invalid email or password.");
  const user = await getUserByEmail(env.DB, email);
  if (!user) {
    // Keep the timing similar to a real verification.
    await hashPassword(password, DUMMY_SALT, PASSWORD_ITERATIONS);
    throw new HttpError(401, "Invalid email or password.");
  }
  const valid = await verifyPassword(password, user.password_salt, user.password_iterations, user.password_hash);
  if (!valid) throw new HttpError(401, "Invalid email or password.");
  if (user.status !== "active") throw new HttpError(403, "This account is disabled.");
  await updateLastLogin(env.DB, user.id);
  const fresh = await getUserById(env.DB, user.id);
  const session = await makeSession(env, fresh, body.meta);
  return { user: userPayload(fresh), session };
}

async function acceptInvite(env, body) {
  const token = String(body.token || "");
  if (token.length < 20) throw new HttpError(400, "Invite link is invalid.");
  if ((await countUsers(env.DB)) >= MAX_USERS) {
    throw new HttpError(409, `This free-tier deployment is limited to ${MAX_USERS} users.`);
  }
  const tokenHash = await sha256Hex(token);
  const invite = await getInviteByHash(env.DB, tokenHash);
  if (!invite) throw new HttpError(404, "Invite not found. Ask the admin for a new link.");
  if (invite.used_at) throw new HttpError(409, "This invite has already been used.");
  if (Number(invite.expires_at) <= Date.now()) throw new HttpError(410, "This invite has expired.");
  const existing = await getUserByEmail(env.DB, invite.email);
  if (existing) throw new HttpError(409, "An account already exists for this email.");
  const name = normalizeName(body.name);
  checkPassword(body.password, invite.email, name);
  const salt = newSalt();
  const hash = await hashPassword(body.password, salt, PASSWORD_ITERATIONS);
  const role = "user";
  let user;
  try {
    user = await createUser(env.DB, {
      id: crypto.randomUUID(),
      email: invite.email,
      name,
      role,
      status: "active",
      passwordHash: hash,
      passwordSalt: salt,
      passwordIterations: PASSWORD_ITERATIONS,
      sessionVersion: 1,
      lastLoginAt: Date.now(),
    });
  } catch (error) {
    if (/unique|constraint/i.test(error.message)) {
      throw new HttpError(409, "An account already exists for this email.");
    }
    throw error;
  }
  await markInviteUsed(env.DB, invite.id, user.id);
  await audit(env.DB, user.id, "invite.accept", invite.id, { email: invite.email });
  const session = await makeSession(env, user, body.meta);
  return { user: userPayload(user), session };
}

async function changePassword(env, body) {
  const user = await getUserById(env.DB, body.userId);
  if (!user || user.status !== "active") throw new HttpError(401, "Sign in required.");
  const current = String(body.currentPassword || "");
  if (current.length > 512) throw new HttpError(403, "Current password is incorrect.", "currentPassword");
  const valid = await verifyPassword(current, user.password_salt, user.password_iterations, user.password_hash);
  if (!valid) throw new HttpError(403, "Current password is incorrect.", "currentPassword");
  checkPassword(body.newPassword, user.email, user.name);
  const salt = newSalt();
  const hash = await hashPassword(body.newPassword, salt, PASSWORD_ITERATIONS);
  await updateUserPassword(env.DB, user.id, hash, salt, PASSWORD_ITERATIONS);
  await deleteUserSessions(env.DB, user.id);
  const fresh = await getUserById(env.DB, user.id);
  await audit(env.DB, user.id, "password.change", user.id);
  const session = await makeSession(env, fresh, body.meta);
  return { user: userPayload(fresh), session };
}

async function resetPassword(env, body) {
  const token = String(body.token || "");
  if (token.length < 20) throw new HttpError(400, "Reset link is invalid.");
  const tokenHash = await sha256Hex(token);
  const reset = await getPasswordResetByHash(env.DB, tokenHash);
  if (!reset) throw new HttpError(404, "Reset link not found. Ask the admin for a new one.");
  if (reset.used_at) throw new HttpError(409, "This reset link has already been used.");
  if (Number(reset.expires_at) <= Date.now()) throw new HttpError(410, "This reset link has expired.");
  const user = await getUserById(env.DB, reset.user_id);
  if (!user) throw new HttpError(404, "Account not found.");
  checkPassword(body.newPassword, user.email, user.name);
  const salt = newSalt();
  const hash = await hashPassword(body.newPassword, salt, PASSWORD_ITERATIONS);
  await updateUserPassword(env.DB, user.id, hash, salt, PASSWORD_ITERATIONS);
  await deleteUserSessions(env.DB, user.id);
  await markPasswordResetUsed(env.DB, reset.id);
  await audit(env.DB, user.id, "password.reset", user.id);
  return { ok: true };
}

async function createReset(env, body) {
  const user = await getUserById(env.DB, body.userId);
  if (!user) throw new HttpError(404, "User not found.");
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const createdAt = Date.now();
  const expiresAt = createdAt + 60 * 60 * 1000;
  await createPasswordReset(env.DB, {
    id: crypto.randomUUID(),
    userId: user.id,
    tokenHash,
    createdAt,
    expiresAt,
  });
  await audit(env.DB, body.actorId || null, "admin.reset-link", user.id);
  return { token, expiresAt };
}

export class AuthDO {
  constructor(state, env) {
    this.state = state;
    this.env = env;
  }

  async fetch(request) {
    const url = new URL(request.url);
    try {
      const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
      if (url.pathname === "/setup") return json(await setup(this.env, body));
      if (url.pathname === "/login") return json(await login(this.env, body));
      if (url.pathname === "/invite") return json(await acceptInvite(this.env, body));
      if (url.pathname === "/password") return json(await changePassword(this.env, body));
      if (url.pathname === "/reset") return json(await resetPassword(this.env, body));
      if (url.pathname === "/create-reset") return json(await createReset(this.env, body));
      return json({ error: "Not found." }, 404);
    } catch (error) {
      if (error instanceof HttpError) return json({ error: error.message, field: error.field || undefined }, error.status);
      console.error("[auth]", error);
      return json({ error: "Authentication service failed." }, 500);
    }
  }
}
