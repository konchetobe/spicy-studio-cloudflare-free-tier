import { Hono } from "hono";
import { HttpError, jsonError } from "./errors.js";
import {
  authResponse,
  clearSession,
  csrf,
  publicUser,
  readSession,
  requireAdmin,
  requireUser,
  requestMeta,
  sameOrigin,
  setSessionCookie,
} from "./auth.js";
import {
  audit,
  bumpSessionVersion,
  cleanupRateLimits,
  countUsers,
  createInvite,
  deleteExpiredInvites,
  deleteExpiredResets,
  deleteExpiredSessions,
  deleteInvite,
  deleteSecret,
  deleteUser,
  deleteUserSessions,
  getSecret,
  getSecretStatus,
  getUserByEmail,
  getUserById,
  listAudit,
  listInvites,
  listTasks,
  listUsers,
  pendingTasks,
  rateLimit,
  setUserStatus,
  storageBytes,
  tasksToday,
  upsertSecret,
} from "./db.js";
import { decryptSecret, encryptSecret, last4 } from "./keys.js";
import { randomToken, sha256Hex } from "./crypto.js";
import { catalogStatus, getModel, getModels } from "./catalog.js";
import { guideFor } from "./guides.js";
import { optimizePrompt, optimizerInfo } from "./optimizer.js";
import { getBalance, testKey, uploadMedia } from "./spicy.js";
import { createTask, deleteUserTask, getUserTask, listUserTasks, publicTask } from "./tasks.js";
import { buildPayload, validateUpload } from "./validate.js";

export { AuthDO } from "./durable/auth-do.js";
export { TaskPoller } from "./durable/task-poller.js";

const MAX_USERS = 10;
const MAX_UPLOAD_BYTES = 95 * 1024 * 1024;
const STORAGE_CAP_BYTES = 9 * 1024 * 1024 * 1024;

const app = new Hono();

app.use("*", async (c, next) => {
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "strict-origin-when-cross-origin");
  c.header("X-Frame-Options", "DENY");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  await next();
});

app.use("/api/*", async (c, next) => {
  c.header("Cache-Control", "no-store");
  await next();
});

app.onError((error, c) => {
  const { status, body } = jsonError(error);
  if (status >= 500) console.error(error);
  return c.json(body, status);
});

app.notFound((c) => c.json({ error: "Not found." }, 404));

function isLocalPreview(env) {
  return env.LOCAL_PREVIEW === "1";
}

async function limit(c, bucket, max, window, message = "Too many attempts. Try again later.") {
  if (isLocalPreview(c.env)) return;
  if (!(await rateLimit(c.env.DB, bucket, max, window))) throw new HttpError(429, message);
}

function origin(c) {
  return c.env.APP_ORIGIN || new URL(c.req.url).origin;
}

async function callAuth(env, path, payload) {
  const stub = env.AUTH.get(env.AUTH.idFromName("global"));
  const response = await stub.fetch(
    new Request(`https://auth${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new HttpError(response.status, data?.error || "Authentication failed.", data?.field || "");
  return data;
}

async function authSession(c, data) {
  setSessionCookie(c, data.session.token, data.session.expiresAt);
  return { user: data.user, csrf: data.session.csrf, expiresAt: data.session.expiresAt };
}

async function getProviderKey(c, provider) {
  const row = await getSecret(c.env.DB, c.get("user").id, provider);
  if (!row) return "";
  return decryptSecret(c.env.KEY_ENCRYPTION_SECRET, c.get("user").id, provider, row);
}

function providerFromParam(value) {
  if (value === "spicy" || value === "runware") return value;
  throw new HttpError(400, "Unknown key provider.");
}

/* ── public / auth ────────────────────────────────────────────────── */

app.get("/api/health", (c) => c.json({ ok: true, version: "1.0.0" }));

app.get("/api/auth/state", async (c) => {
  const [users, auth] = await Promise.all([countUsers(c.env.DB), readSession(c)]);
  return c.json({
    bootstrapped: users > 0,
    setupAvailable: Boolean(c.env.SETUP_TOKEN),
    maxUsers: MAX_USERS,
    user: auth ? publicUser(auth.user) : null,
    csrf: auth?.session.csrf || "",
  });
});

app.post("/api/auth/setup", sameOrigin, async (c) => {
  const meta = requestMeta(c);
  await limit(c, `setup:${meta.ip}`, 5, 3600, "Too many setup attempts. Try again later.");
  const body = await c.req.json().catch(() => ({}));
  const data = await callAuth(c.env, "/setup", { ...body, meta });
  return c.json(await authSession(c, data));
});

app.post("/api/auth/login", sameOrigin, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const meta = requestMeta(c);
  const email = String(body.email || "").slice(0, 254);
  await limit(c, `login:${meta.ip}:${email.toLowerCase()}`, 10, 900, "Too many sign-in attempts. Try again in a few minutes.");
  const data = await callAuth(c.env, "/login", { ...body, meta });
  return c.json(await authSession(c, data));
});

app.post("/api/invites/accept", sameOrigin, async (c) => {
  const meta = requestMeta(c);
  await limit(c, `invite:${meta.ip}`, 10, 3600, "Too many invite attempts. Try again later.");
  const body = await c.req.json().catch(() => ({}));
  const data = await callAuth(c.env, "/invite", { ...body, meta });
  return c.json(await authSession(c, data));
});

app.post("/api/auth/reset", sameOrigin, async (c) => {
  const meta = requestMeta(c);
  await limit(c, `reset:${meta.ip}`, 10, 3600, "Too many reset attempts. Try again later.");
  const body = await c.req.json().catch(() => ({}));
  return c.json(await callAuth(c.env, "/reset", body));
});

app.get("/api/auth/me", requireUser, (c) => c.json(authResponse(c.get("user"), c.get("session"))));

app.post("/api/auth/logout", requireUser, csrf, async (c) => {
  await clearSession(c);
  return c.json({ ok: true });
});

app.post("/api/auth/password", requireUser, csrf, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const meta = requestMeta(c);
  const data = await callAuth(c.env, "/password", { ...body, userId: c.get("user").id, meta });
  await audit(c.env.DB, c.get("user").id, "password.change", c.get("user").id);
  return c.json(await authSession(c, data));
});

/* ── admin ────────────────────────────────────────────────────────── */

app.get("/api/admin/users", requireAdmin, async (c) => {
  const users = await listUsers(c.env.DB);
  return c.json({
    users: users.map((user) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      status: user.status,
      createdAt: Number(user.created_at),
      lastLoginAt: user.last_login_at ? Number(user.last_login_at) : null,
      lastSeenAt: user.last_seen_at ? Number(user.last_seen_at) : null,
      taskCount: Number(user.task_count || 0),
      storageBytes: Number(user.storage_bytes || 0),
      spicy: user.spicy_last4 ? { configured: true, last4: user.spicy_last4 } : { configured: false },
      runware: user.runware_last4 ? { configured: true, last4: user.runware_last4 } : { configured: false },
    })),
    maxUsers: MAX_USERS,
  });
});

app.post("/api/admin/invites", requireAdmin, csrf, async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const email = String(body.email || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw new HttpError(400, "Enter a valid email address.", "email");
  if (await getUserByEmail(c.env.DB, email)) throw new HttpError(409, "A user with that email already exists.");
  const existing = await c.env.DB.prepare(
    "SELECT id FROM invites WHERE email = ? COLLATE NOCASE AND used_at IS NULL AND expires_at > ?"
  )
    .bind(email, Date.now())
    .first();
  if (existing) throw new HttpError(409, "An invite is already pending for that email.");
  if ((await countUsers(c.env.DB)) >= MAX_USERS) {
    throw new HttpError(409, `This free-tier deployment is limited to ${MAX_USERS} users.`);
  }
  const token = randomToken(32);
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const expiresAt = createdAt + 72 * 60 * 60 * 1000;
  await createInvite(c.env.DB, {
    id,
    email,
    tokenHash: await sha256Hex(token),
    createdBy: c.get("user").id,
    createdAt,
    expiresAt,
  });
  await audit(c.env.DB, c.get("user").id, "admin.invite-create", id, { email });
  return c.json({ id, email, expiresAt, url: `${origin(c)}/invite#${token}` }, 201);
});

app.get("/api/admin/invites", requireAdmin, async (c) => {
  const invites = await listInvites(c.env.DB);
  return c.json({
    invites: invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      createdAt: Number(invite.created_at),
      expiresAt: Number(invite.expires_at),
      usedAt: invite.used_at ? Number(invite.used_at) : null,
      usedByName: invite.used_by_name || "",
      expired: !invite.used_at && Number(invite.expires_at) <= Date.now(),
    })),
  });
});

app.delete("/api/admin/invites/:id", requireAdmin, csrf, async (c) => {
  const id = c.req.param("id");
  await deleteInvite(c.env.DB, id);
  await audit(c.env.DB, c.get("user").id, "admin.invite-revoke", id);
  return c.json({ ok: true });
});

app.patch("/api/admin/users/:id", requireAdmin, csrf, async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => ({}));
  const status = body.status === "disabled" ? "disabled" : body.status === "active" ? "active" : "";
  if (!status) throw new HttpError(400, "Status must be active or disabled.");
  if (id === c.get("user").id) throw new HttpError(400, "You cannot change your own status.");
  const target = await getUserById(c.env.DB, id);
  if (!target) throw new HttpError(404, "User not found.");
  if (target.role === "admin") throw new HttpError(403, "The admin account cannot be disabled.");
  await setUserStatus(c.env.DB, id, status);
  if (status === "disabled") await deleteUserSessions(c.env.DB, id);
  await audit(c.env.DB, c.get("user").id, `admin.user-${status}`, id);
  return c.json({ ok: true });
});

app.post("/api/admin/users/:id/logout-all", requireAdmin, csrf, async (c) => {
  const id = c.req.param("id");
  const target = await getUserById(c.env.DB, id);
  if (!target) throw new HttpError(404, "User not found.");
  if (id === c.get("user").id) throw new HttpError(400, "Use Sign out for your own session.");
  await bumpSessionVersion(c.env.DB, id);
  await deleteUserSessions(c.env.DB, id);
  await audit(c.env.DB, c.get("user").id, "admin.logout-all", id);
  return c.json({ ok: true });
});

app.post("/api/admin/users/:id/reset", requireAdmin, csrf, async (c) => {
  const id = c.req.param("id");
  const target = await getUserById(c.env.DB, id);
  if (!target) throw new HttpError(404, "User not found.");
  const data = await callAuth(c.env, "/create-reset", { userId: id, actorId: c.get("user").id });
  return c.json({
    url: `${origin(c)}/reset#${data.token}`,
    expiresAt: data.expiresAt,
  });
});

app.delete("/api/admin/users/:id", requireAdmin, csrf, async (c) => {
  const id = c.req.param("id");
  if (id === c.get("user").id) throw new HttpError(400, "You cannot delete the admin account.");
  const target = await getUserById(c.env.DB, id);
  if (!target) throw new HttpError(404, "User not found.");
  if (target.role === "admin") throw new HttpError(403, "The admin account cannot be deleted.");
  const tasks = await listTasks(c.env.DB, id, 1000);
  const keys = tasks.flatMap((task) => (task.outputs || []).map((output) => output.key).filter(Boolean));
  if (keys.length && c.env.MEDIA) await c.env.MEDIA.delete(keys);
  await deleteUser(c.env.DB, id);
  await audit(c.env.DB, c.get("user").id, "admin.user-delete", id, { email: target.email });
  return c.json({ ok: true });
});

app.get("/api/admin/usage", requireAdmin, async (c) => {
  const [users, tasks, storage] = await Promise.all([
    countUsers(c.env.DB),
    tasksToday(c.env.DB),
    storageBytes(c.env.DB),
  ]);
  return c.json({
    users,
    maxUsers: MAX_USERS,
    tasksToday: tasks,
    storageBytes: storage,
    storageCapBytes: STORAGE_CAP_BYTES,
    freeTier: {
      workersRequestsPerDay: 100_000,
      d1WritesPerDay: 100_000,
      r2StorageBytes: 10 * 1024 * 1024 * 1024,
    },
  });
});

app.get("/api/admin/audit", requireAdmin, async (c) => {
  const rows = await listAudit(c.env.DB, 100);
  return c.json({
    entries: rows.map((row) => ({
      id: row.id,
      actorId: row.actor_id,
      action: row.action,
      targetId: row.target_id,
      meta: row.meta_json ? JSON.parse(row.meta_json) : null,
      createdAt: Number(row.created_at),
    })),
  });
});

/* ── user settings ────────────────────────────────────────────────── */

app.get("/api/settings/keys", requireUser, async (c) => {
  return c.json({ keys: await getSecretStatus(c.env.DB, c.get("user").id) });
});

app.put("/api/settings/keys/:provider", requireUser, csrf, async (c) => {
  const userId = c.get("user").id;
  await limit(c, `keys:${userId}`, 20, 3600, "Too many key changes. Try again later.");
  const provider = providerFromParam(c.req.param("provider"));
  const body = await c.req.json().catch(() => ({}));
  const key = String(body.key || "").trim();
  if (key.length < 8 || key.length > 512) throw new HttpError(400, "API key looks invalid.", "key");
  if (provider === "spicy") {
    try {
      await testKey(c.env, key);
    } catch (error) {
      throw new HttpError(400, `That SpicyModels key was rejected: ${error.message}`, "key");
    }
  }
  const encrypted = await encryptSecret(c.env.KEY_ENCRYPTION_SECRET, c.get("user").id, provider, key);
  await upsertSecret(
    c.env.DB,
    c.get("user").id,
    provider,
    encrypted.ciphertext,
    encrypted.iv,
    last4(key),
    encrypted.keyVersion
  );
  await audit(c.env.DB, c.get("user").id, "keys.save", c.get("user").id, { provider });
  return c.json({ ok: true, keys: await getSecretStatus(c.env.DB, c.get("user").id) });
});

app.delete("/api/settings/keys/:provider", requireUser, csrf, async (c) => {
  const provider = providerFromParam(c.req.param("provider"));
  await deleteSecret(c.env.DB, c.get("user").id, provider);
  await audit(c.env.DB, c.get("user").id, "keys.delete", c.get("user").id, { provider });
  return c.json({ ok: true, keys: await getSecretStatus(c.env.DB, c.get("user").id) });
});

app.post("/api/settings/keys/:provider/test", requireUser, csrf, async (c) => {
  const provider = providerFromParam(c.req.param("provider"));
  const key = await getProviderKey(c, provider);
  if (!key) throw new HttpError(400, "No key is configured.");
  if (provider === "spicy") {
    const balance = await getBalance(c.env, key);
    return c.json({ ok: true, balance });
  }
  return c.json({ ok: true, note: "Runware keys are verified on the first optimization." });
});

/* ── studio ───────────────────────────────────────────────────────── */

app.get("/api/models", requireUser, async (c) => {
  const models = await getModels(c.env);
  const status = await getSecretStatus(c.env.DB, c.get("user").id);
  return c.json({
    models,
    catalog: catalogStatus(),
    optimizer: optimizerInfo(status.runware.configured, c.env),
    configured: status.spicy.configured,
  });
});

app.get("/api/models/:id", requireUser, async (c) => {
  const model = await getModel(c.env, c.req.param("id"));
  if (!model) throw new HttpError(404, "Unknown model.");
  return c.json({ model });
});

app.get("/api/balance", requireUser, async (c) => {
  const key = await getProviderKey(c, "spicy");
  if (!key) return c.json({ configured: false });
  try {
    return c.json({ configured: true, balance: await getBalance(c.env, key) });
  } catch (error) {
    return c.json({ configured: true, error: error.message, requestId: error.requestId || "" });
  }
});

app.post("/api/optimize", requireUser, csrf, async (c) => {
  const userId = c.get("user").id;
  await limit(c, `optimize:${userId}`, 30, 900, "Too many optimizations. Wait a few minutes.");
  const body = await c.req.json().catch(() => ({}));
  const { model: modelId, prompt, ...params } = body;
  if (!modelId) throw new HttpError(400, "Choose a model first.", "model");
  if (!prompt || !String(prompt).trim()) throw new HttpError(400, "Write an idea before optimizing.", "prompt");
  const model = await getModel(c.env, modelId);
  if (!model) throw new HttpError(400, "Unknown model.", "model");
  if (!model.contract) throw new HttpError(400, "This model has no mapped prompt schema yet.", "model");
  const guide = guideFor(model.contract);
  const runwareKey = await getProviderKey(c, "runware");
  const result = await optimizePrompt({
    env: c.env,
    runwareKey,
    userId: c.get("user").id,
    model,
    contract: model.contract,
    guide,
    input: { ...params, prompt: String(prompt) },
  });
  return c.json(result);
});

app.post("/api/generate", requireUser, csrf, async (c) => {
  const userId = c.get("user").id;
  await limit(c, `generate:${userId}`, 20, 900, "Too many generations. Wait a few minutes.");
  const key = await getProviderKey(c, "spicy");
  if (!key) throw new HttpError(400, "Add your SpicyModels API key in Settings before generating.");
  const body = await c.req.json().catch(() => ({}));
  const { model: modelId, ...input } = body;
  if (!modelId) throw new HttpError(400, "Choose a model first.", "model");
  const model = await getModel(c.env, modelId);
  if (!model) throw new HttpError(400, "Unknown model.", "model");
  if (!model.contract) throw new HttpError(400, "This model has no mapped schema.", "model");
  const { payload } = buildPayload(model, input);
  const task = await createTask(c.env, c.get("user"), model, payload);
  return c.json({ task }, 202);
});

app.get("/api/tasks", requireUser, async (c) => {
  return c.json({ tasks: await listUserTasks(c.env, c.get("user").id) });
});

app.get("/api/tasks/:id", requireUser, async (c) => {
  const task = await getUserTask(c.env, c.get("user").id, c.req.param("id"));
  return c.json({ task: publicTask(task) });
});

app.delete("/api/tasks/:id", requireUser, csrf, async (c) => {
  const task = await getUserTask(c.env, c.get("user").id, c.req.param("id"));
  await deleteUserTask(c.env, task);
  return c.json({ ok: true });
});

app.post("/api/upload", requireUser, csrf, async (c) => {
  const userId = c.get("user").id;
  await limit(c, `upload:${userId}`, 20, 3600, "Too many uploads. Try again later.");
  const key = await getProviderKey(c, "spicy");
  if (!key) throw new HttpError(400, "Add your SpicyModels API key in Settings before uploading.");
  const length = Number(c.req.header("content-length") || 0);
  if (!length) throw new HttpError(411, "Content-Length is required.");
  if (length > MAX_UPLOAD_BYTES) throw new HttpError(413, "Files can be up to 95 MB on this free-tier deployment.");
  let filename;
  try {
    filename = decodeURIComponent(c.req.header("x-filename") || "upload.bin");
  } catch {
    filename = "upload.bin";
  }
  filename = filename.slice(0, 180);
  const contentType = c.req.header("content-type") || "application/octet-stream";
  const resolved = validateUpload({ filename, contentType, size: length });
  const uploaded = await uploadMedia(c.env, key, c.req.raw.body, filename, resolved.contentType);
  if (!uploaded?.download_url) throw new HttpError(502, "Upload succeeded but no download URL was returned.");
  return c.json({
    url: uploaded.download_url,
    type: uploaded.type,
    filename: uploaded.filename,
    size: uploaded.size,
  });
});

/* ── media ────────────────────────────────────────────────────────── */

function parseRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(value || "").trim());
  if (!match) return null;
  const start = match[1] ? Number(match[1]) : 0;
  const end = match[2] ? Number(match[2]) : size - 1;
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return null;
  return { offset: start, length: end - start + 1 };
}

app.get("/media/:taskId/:index", requireUser, async (c) => {
  const task = await getUserTask(c.env, c.get("user").id, c.req.param("taskId"));
  const index = Number(c.req.param("index"));
  const output = (task.outputs || [])[Number.isInteger(index) ? index : -1];
  if (!output) throw new HttpError(404, "Media not found.");
  if (!output.key) {
    if (output.remote) return c.redirect(output.remote);
    throw new HttpError(404, "Media not found.");
  }
  if (!c.env.MEDIA) {
    if (output.remote) return c.redirect(output.remote);
    throw new HttpError(404, "Media storage is not enabled.");
  }
  const rangeHeader = c.req.header("range");
  const head = await c.env.MEDIA.head(output.key);
  if (!head) throw new HttpError(404, "Media not found.");
  const range = rangeHeader ? parseRange(rangeHeader, head.size) : null;
  const object = await c.env.MEDIA.get(output.key, range ? { range: { offset: range.offset, length: range.length } } : undefined);
  if (!object) throw new HttpError(404, "Media not found.");
  const etag = object.httpEtag || head.httpEtag;
  if (c.req.header("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  const headers = new Headers();
  headers.set("Content-Type", object.httpMetadata?.contentType || output.contentType || "application/octet-stream");
  headers.set("Accept-Ranges", "bytes");
  if (etag) headers.set("ETag", etag);
  headers.set("Cache-Control", "private, max-age=3600");
  if (range) {
    headers.set("Content-Length", String(range.length));
    headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`);
    return new Response(object.body, { status: 206, headers });
  }
  headers.set("Content-Length", String(head.size));
  return new Response(object.body, { status: 200, headers });
});

/* ── cron ─────────────────────────────────────────────────────────── */

async function maintenance(env) {
  const now = Date.now();
  await Promise.allSettled([
    deleteExpiredSessions(env.DB, now),
    deleteExpiredInvites(env.DB, now),
    deleteExpiredResets(env.DB, now),
    cleanupRateLimits(env.DB, Math.floor(now / 1000) - 2 * 24 * 3600),
  ]);
  const pending = await pendingTasks(env.DB, now - 60_000, 20);
  await Promise.allSettled(
    pending.map(async (task) => {
      const stub = env.TASKS.get(env.TASKS.idFromName(task.id));
      await stub.fetch(
        new Request("https://task/resume", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ taskId: task.id }),
        })
      );
    })
  );
}

export default {
  fetch: (request, env, ctx) => app.fetch(request, env, ctx),
  async scheduled(event, env, ctx) {
    ctx.waitUntil(maintenance(env));
  },
};
