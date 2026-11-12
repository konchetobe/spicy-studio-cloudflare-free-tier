/* D1 repositories. Every task and media query is scoped by user id. */

export const now = () => Date.now();

/* ── users ─────────────────────────────────────────────────────────── */

export async function countUsers(db) {
  const row = await db.prepare("SELECT COUNT(*) AS n FROM users").first();
  return Number(row?.n || 0);
}

export async function getUserByEmail(db, email) {
  return db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").bind(String(email || "").trim()).first();
}

export async function getUserById(db, id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first();
}

export async function createUser(db, user) {
  await db
    .prepare(
      `INSERT INTO users
       (id, email, name, role, status, password_hash, password_salt, password_iterations,
        session_version, created_at, last_login_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      user.id,
      String(user.email).toLowerCase(),
      user.name,
      user.role || "user",
      user.status || "active",
      user.passwordHash,
      user.passwordSalt,
      user.passwordIterations,
      user.sessionVersion || 1,
      user.createdAt || now(),
      user.lastLoginAt || null,
      user.lastSeenAt || null
    )
    .run();
  return getUserById(db, user.id);
}

export async function updateUserPassword(db, userId, passwordHash, passwordSalt, iterations) {
  await db
    .prepare(
      `UPDATE users SET password_hash = ?, password_salt = ?, password_iterations = ?,
       session_version = session_version + 1 WHERE id = ?`
    )
    .bind(passwordHash, passwordSalt, iterations, userId)
    .run();
}

export async function setUserStatus(db, userId, status) {
  await db.prepare("UPDATE users SET status = ? WHERE id = ?").bind(status, userId).run();
}

export async function updateLastLogin(db, userId) {
  await db.prepare("UPDATE users SET last_login_at = ? WHERE id = ?").bind(now(), userId).run();
}

export async function touchUser(db, userId) {
  await db
    .prepare("UPDATE users SET last_seen_at = ? WHERE id = ? AND (last_seen_at IS NULL OR last_seen_at < ?)")
    .bind(now(), userId, now() - 5 * 60 * 1000)
    .run();
}

export async function bumpSessionVersion(db, userId) {
  await db.prepare("UPDATE users SET session_version = session_version + 1 WHERE id = ?").bind(userId).run();
}

export async function listUsers(db) {
  const result = await db
    .prepare(
      `SELECT
         u.id, u.email, u.name, u.role, u.status, u.created_at, u.last_login_at, u.last_seen_at,
         (SELECT COUNT(*) FROM tasks t WHERE t.user_id = u.id) AS task_count,
         (SELECT COALESCE(SUM(t.media_bytes), 0) FROM tasks t WHERE t.user_id = u.id) AS storage_bytes,
         (SELECT last4 FROM user_secrets s WHERE s.user_id = u.id AND s.provider = 'spicy') AS spicy_last4,
         (SELECT last4 FROM user_secrets s WHERE s.user_id = u.id AND s.provider = 'runware') AS runware_last4
       FROM users u
       ORDER BY u.created_at ASC`
    )
    .all();
  return result.results || [];
}

export async function deleteUser(db, userId) {
  await db.batch([
    db.prepare("DELETE FROM tasks WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM user_secrets WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM invites WHERE created_by = ?").bind(userId),
    db.prepare("DELETE FROM password_resets WHERE user_id = ?").bind(userId),
    db.prepare("DELETE FROM audit_log WHERE actor_id = ?").bind(userId),
    db.prepare("DELETE FROM users WHERE id = ?").bind(userId),
  ]);
}

/* ── sessions ──────────────────────────────────────────────────────── */

export async function createSession(db, session) {
  await db
    .prepare(
      `INSERT INTO sessions (id, user_id, csrf, session_version, created_at, expires_at, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      session.id,
      session.userId,
      session.csrf,
      session.sessionVersion,
      session.createdAt,
      session.expiresAt,
      session.ip || "",
      session.userAgent || ""
    )
    .run();
}

export async function getSession(db, id) {
  return db.prepare("SELECT * FROM sessions WHERE id = ?").bind(id).first();
}

export async function deleteSession(db, id) {
  await db.prepare("DELETE FROM sessions WHERE id = ?").bind(id).run();
}

export async function deleteUserSessions(db, userId) {
  await db.prepare("DELETE FROM sessions WHERE user_id = ?").bind(userId).run();
}

export async function deleteExpiredSessions(db, before = now()) {
  await db.prepare("DELETE FROM sessions WHERE expires_at < ?").bind(before).run();
}

/* ── invites ───────────────────────────────────────────────────────── */

export async function createInvite(db, invite) {
  await db
    .prepare(
      `INSERT INTO invites (id, email, token_hash, created_by, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .bind(invite.id, String(invite.email).toLowerCase(), invite.tokenHash, invite.createdBy, invite.createdAt, invite.expiresAt)
    .run();
}

export async function getInviteByHash(db, tokenHash) {
  return db.prepare("SELECT * FROM invites WHERE token_hash = ?").bind(tokenHash).first();
}

export async function markInviteUsed(db, id, userId) {
  await db.prepare("UPDATE invites SET used_at = ?, used_by = ? WHERE id = ?").bind(now(), userId, id).run();
}

export async function listInvites(db) {
  const result = await db
    .prepare(
      `SELECT i.id, i.email, i.created_at, i.expires_at, i.used_at, i.used_by,
              u.name AS used_by_name
       FROM invites i LEFT JOIN users u ON u.id = i.used_by
       ORDER BY i.created_at DESC LIMIT 100`
    )
    .all();
  return result.results || [];
}

export async function deleteInvite(db, id) {
  await db.prepare("DELETE FROM invites WHERE id = ?").bind(id).run();
}

export async function deleteExpiredInvites(db, before = now()) {
  await db.prepare("DELETE FROM invites WHERE expires_at < ?").bind(before).run();
}

/* ── password resets ───────────────────────────────────────────────── */

export async function createPasswordReset(db, reset) {
  await db
    .prepare(
      `INSERT INTO password_resets (id, user_id, token_hash, created_at, expires_at)
       VALUES (?, ?, ?, ?, ?)`
    )
    .bind(reset.id, reset.userId, reset.tokenHash, reset.createdAt, reset.expiresAt)
    .run();
}

export async function getPasswordResetByHash(db, tokenHash) {
  return db.prepare("SELECT * FROM password_resets WHERE token_hash = ?").bind(tokenHash).first();
}

export async function markPasswordResetUsed(db, id) {
  await db.prepare("UPDATE password_resets SET used_at = ? WHERE id = ?").bind(now(), id).run();
}

export async function deleteExpiredResets(db, before = now()) {
  await db.prepare("DELETE FROM password_resets WHERE expires_at < ?").bind(before).run();
}

/* ── encrypted user secrets ────────────────────────────────────────── */

export async function getSecret(db, userId, provider) {
  return db
    .prepare("SELECT * FROM user_secrets WHERE user_id = ? AND provider = ?")
    .bind(userId, provider)
    .first();
}

export async function getSecretStatus(db, userId) {
  const result = await db
    .prepare("SELECT provider, last4, updated_at FROM user_secrets WHERE user_id = ?")
    .bind(userId)
    .all();
  const rows = result.results || [];
  const byProvider = Object.fromEntries(rows.map((row) => [row.provider, row]));
  return {
    spicy: byProvider.spicy
      ? { configured: true, last4: byProvider.spicy.last4, updatedAt: byProvider.spicy.updated_at }
      : { configured: false, last4: "", updatedAt: null },
    runware: byProvider.runware
      ? { configured: true, last4: byProvider.runware.last4, updatedAt: byProvider.runware.updated_at }
      : { configured: false, last4: "", updatedAt: null },
  };
}

export async function upsertSecret(db, userId, provider, ciphertext, iv, last4Value, keyVersion = 1) {
  await db
    .prepare(
      `INSERT INTO user_secrets (user_id, provider, ciphertext, iv, last4, key_version, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(user_id, provider) DO UPDATE SET
         ciphertext = excluded.ciphertext,
         iv = excluded.iv,
         last4 = excluded.last4,
         key_version = excluded.key_version,
         updated_at = excluded.updated_at`
    )
    .bind(userId, provider, ciphertext, iv, last4Value, keyVersion, now())
    .run();
}

export async function deleteSecret(db, userId, provider) {
  await db.prepare("DELETE FROM user_secrets WHERE user_id = ? AND provider = ?").bind(userId, provider).run();
}

/* ── tasks ─────────────────────────────────────────────────────────── */

const TASK_COLUMNS = {
  spicyId: "spicy_id",
  model: "model",
  modelTitle: "model_title",
  kind: "kind",
  prompt: "prompt",
  params: "params_json",
  status: "status",
  spicyStatus: "spicy_status",
  error: "error",
  outputs: "outputs_json",
  mediaBytes: "media_bytes",
  timeoutMinutes: "timeout_minutes",
  requestId: "request_id",
  startedAt: "started_at",
  completedAt: "completed_at",
  nextPollAt: "next_poll_at",
  pollAttempts: "poll_attempts",
};

export function rowToTask(row) {
  if (!row) return null;
  let params = {};
  let outputs = [];
  try {
    params = JSON.parse(row.params_json || "{}");
  } catch {
    params = {};
  }
  try {
    outputs = JSON.parse(row.outputs_json || "[]");
  } catch {
    outputs = [];
  }
  return {
    id: row.id,
    userId: row.user_id,
    spicyId: row.spicy_id || "",
    model: row.model,
    modelTitle: row.model_title || row.model,
    kind: row.kind,
    prompt: row.prompt || "",
    params,
    status: row.status,
    spicyStatus: row.spicy_status || "",
    error: row.error || "",
    outputs,
    mediaBytes: Number(row.media_bytes || 0),
    timeoutMinutes: Number(row.timeout_minutes || 30),
    requestId: row.request_id || "",
    createdAt: Number(row.created_at),
    updatedAt: Number(row.updated_at),
    startedAt: Number(row.started_at || 0),
    completedAt: Number(row.completed_at || 0),
    nextPollAt: row.next_poll_at ? Number(row.next_poll_at) : null,
    pollAttempts: Number(row.poll_attempts || 0),
  };
}

export async function insertTask(db, task) {
  await db
    .prepare(
      `INSERT INTO tasks
       (id, user_id, spicy_id, model, model_title, kind, prompt, params_json, status,
        spicy_status, error, outputs_json, media_bytes, timeout_minutes, request_id,
        created_at, updated_at, started_at, completed_at, next_poll_at, poll_attempts)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      task.id,
      task.userId,
      task.spicyId || "",
      task.model,
      task.modelTitle || task.model,
      task.kind,
      task.prompt || "",
      JSON.stringify(task.params || {}),
      task.status,
      task.spicyStatus || "",
      task.error || "",
      JSON.stringify(task.outputs || []),
      task.mediaBytes || 0,
      task.timeoutMinutes || 30,
      task.requestId || "",
      task.createdAt,
      task.updatedAt,
      task.startedAt || 0,
      task.completedAt || 0,
      task.nextPollAt || null,
      task.pollAttempts || 0
    )
    .run();
}

export async function getTask(db, id) {
  return rowToTask(await db.prepare("SELECT * FROM tasks WHERE id = ?").bind(id).first());
}

export async function getTaskForUser(db, id, userId) {
  return rowToTask(
    await db.prepare("SELECT * FROM tasks WHERE id = ? AND user_id = ?").bind(id, userId).first()
  );
}

export async function listTasks(db, userId, limit = 100) {
  const result = await db
    .prepare("SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC LIMIT ?")
    .bind(userId, limit)
    .all();
  return (result.results || []).map(rowToTask);
}

export async function updateTask(db, id, patch) {
  const sets = [];
  const values = [];
  for (const [key, value] of Object.entries(patch)) {
    const column = TASK_COLUMNS[key];
    if (!column) continue;
    sets.push(`${column} = ?`);
    values.push(key === "params" || key === "outputs" ? JSON.stringify(value || (key === "params" ? {} : [])) : value);
  }
  if (!sets.length) return;
  sets.push("updated_at = ?");
  values.push(now());
  values.push(id);
  await db.prepare(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`).bind(...values).run();
}

export async function deleteTask(db, id) {
  await db.prepare("DELETE FROM tasks WHERE id = ?").bind(id).run();
}

export async function pendingTasks(db, staleBefore, limit = 20) {
  const result = await db
    .prepare(
      `SELECT * FROM tasks
       WHERE status IN ('submitting', 'processing')
         AND (next_poll_at IS NULL OR next_poll_at < ?)
       ORDER BY created_at ASC LIMIT ?`
    )
    .bind(staleBefore, limit)
    .all();
  return (result.results || []).map(rowToTask);
}

export async function storageBytes(db) {
  const row = await db.prepare("SELECT COALESCE(SUM(media_bytes), 0) AS n FROM tasks").first();
  return Number(row?.n || 0);
}

export async function activeTaskCount(db, userId) {
  const row = await db
    .prepare("SELECT COUNT(*) AS n FROM tasks WHERE user_id = ? AND status IN ('submitting', 'processing')")
    .bind(userId)
    .first();
  return Number(row?.n || 0);
}

export async function tasksToday(db) {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const row = await db.prepare("SELECT COUNT(*) AS n FROM tasks WHERE created_at >= ?").bind(start.getTime()).first();
  return Number(row?.n || 0);
}

/* ── audit / settings / rate limits ────────────────────────────────── */

export async function audit(db, actorId, action, targetId = null, meta = null) {
  await db
    .prepare("INSERT INTO audit_log (id, actor_id, action, target_id, meta_json, created_at) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(crypto.randomUUID(), actorId || null, action, targetId || null, meta ? JSON.stringify(meta) : null, now())
    .run();
}

export async function listAudit(db, limit = 100) {
  const result = await db
    .prepare("SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ?")
    .bind(limit)
    .all();
  return result.results || [];
}

export async function getSetting(db, key) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first();
  return row?.value ?? null;
}

export async function setSetting(db, key, value) {
  await db
    .prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .bind(key, String(value))
    .run();
}

export async function rateLimit(db, bucket, limit, windowSeconds) {
  const windowStart = Math.floor(now() / 1000 / windowSeconds) * windowSeconds;
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (bucket, window_start, count) VALUES (?, ?, 1)
       ON CONFLICT(bucket, window_start) DO UPDATE SET count = count + 1
       RETURNING count`
    )
    .bind(bucket, windowStart)
    .first();
  return Number(row?.count || 1) <= limit;
}

export async function cleanupRateLimits(db, before) {
  await db.prepare("DELETE FROM rate_limits WHERE window_start < ?").bind(before).run();
}
