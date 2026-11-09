CREATE TABLE IF NOT EXISTS auth_login_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  redirect_path TEXT,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS auth_login_tokens_token_hash_idx
  ON auth_login_tokens (token_hash);
CREATE INDEX IF NOT EXISTS auth_login_tokens_email_idx
  ON auth_login_tokens (email);
CREATE INDEX IF NOT EXISTS auth_login_tokens_expires_at_idx
  ON auth_login_tokens (expires_at);
