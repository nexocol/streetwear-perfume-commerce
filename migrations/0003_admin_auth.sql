-- V4.9 admin access: ADDITIVE ONLY. Creates new authentication tables; no commerce table is read, altered or dropped.
-- Do NOT apply with `wrangler d1 migrations apply --remote`: production D1 does not track 0001/0002 (the Worker created that
-- schema at runtime), so that command would try to re-run the 0002 seed. Run only these statements, with `d1 execute`.
-- Accounts are never seeded here (no credential material in git): scripts/admin-bootstrap.mjs creates them at deploy time.

CREATE TABLE IF NOT EXISTS admin_users(
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('client','demo')),
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_iterations INTEGER NOT NULL,
  must_change_password INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- id is the SHA-256 of the session token; the token itself only ever lives in the browser cookie.
CREATE TABLE IF NOT EXISTS admin_sessions(
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_user ON admin_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_expires ON admin_sessions(expires_at);

-- Failed-login counters used for short lockouts (one row per scope:username and per scope:ip).
CREATE TABLE IF NOT EXISTS admin_login_attempts(
  key TEXT PRIMARY KEY,
  failures INTEGER NOT NULL DEFAULT 0,
  locked_until TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_admin_login_attempts_updated ON admin_login_attempts(updated_at);
