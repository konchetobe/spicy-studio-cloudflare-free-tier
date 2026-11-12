-- Spicy Studio Cloudflare Free Tier — initial schema.
-- All timestamps are Unix milliseconds.

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  session_version INTEGER NOT NULL DEFAULT 1,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER,
  last_seen_at INTEGER
);

CREATE UNIQUE INDEX IF NOT EXISTS one_admin
  ON users(role) WHERE role = 'admin';
CREATE INDEX IF NOT EXISTS users_status ON users(status);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  csrf TEXT NOT NULL,
  session_version INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  ip TEXT,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expiry ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE,
  token_hash TEXT NOT NULL UNIQUE,
  created_by TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
  used_by TEXT
);

CREATE INDEX IF NOT EXISTS invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS invites_expiry ON invites(expires_at);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  used_at INTEGER
);

CREATE INDEX IF NOT EXISTS resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS resets_expiry ON password_resets(expires_at);

CREATE TABLE IF NOT EXISTS user_secrets (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('spicy', 'runware')),
  ciphertext TEXT NOT NULL,
  iv TEXT NOT NULL,
  last4 TEXT NOT NULL,
  key_version INTEGER NOT NULL DEFAULT 1,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, provider)
);

CREATE TABLE IF NOT EXISTS tasks (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  spicy_id TEXT,
  model TEXT NOT NULL,
  model_title TEXT,
  kind TEXT NOT NULL,
  prompt TEXT NOT NULL,
  params_json TEXT NOT NULL,
  status TEXT NOT NULL,
  spicy_status TEXT,
  error TEXT,
  outputs_json TEXT NOT NULL DEFAULT '[]',
  media_bytes INTEGER NOT NULL DEFAULT 0,
  timeout_minutes INTEGER NOT NULL DEFAULT 30,
  request_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  started_at INTEGER,
  completed_at INTEGER,
  next_poll_at INTEGER,
  poll_attempts INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS tasks_user_created ON tasks(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS tasks_pending ON tasks(status, next_poll_at);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_id TEXT,
  meta_json TEXT,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS audit_created ON audit_log(created_at DESC);

CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT NOT NULL,
  window_start INTEGER NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (bucket, window_start)
);
