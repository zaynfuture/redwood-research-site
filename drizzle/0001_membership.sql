ALTER TABLE users ADD COLUMN display_name TEXT;
ALTER TABLE users ADD COLUMN google_sub TEXT;
ALTER TABLE users ADD COLUMN plan TEXT NOT NULL DEFAULT 'legacy' CHECK (plan IN ('free', 'individual', 'enterprise', 'legacy'));
ALTER TABLE users ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'active' CHECK (subscription_status IN ('inactive', 'active', 'trialing', 'past_due', 'canceled'));
ALTER TABLE users ADD COLUMN stripe_customer_id TEXT;
ALTER TABLE users ADD COLUMN stripe_subscription_id TEXT;
ALTER TABLE users ADD COLUMN current_period_end TEXT;

CREATE UNIQUE INDEX idx_users_google_sub ON users(google_sub) WHERE google_sub IS NOT NULL;
CREATE UNIQUE INDEX idx_users_stripe_customer_id ON users(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;

CREATE TABLE account_sessions (
  token_hash TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX idx_account_sessions_user_id ON account_sessions(user_id);
CREATE INDEX idx_account_sessions_expires_at ON account_sessions(expires_at);

CREATE TABLE oauth_states (
  state_hash TEXT PRIMARY KEY NOT NULL,
  nonce TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE monthly_chat_usage (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  usage_month TEXT NOT NULL,
  used INTEGER NOT NULL DEFAULT 0 CHECK (used >= 0),
  PRIMARY KEY (user_id, usage_month)
);

CREATE TABLE stripe_events (
  event_id TEXT PRIMARY KEY NOT NULL,
  event_type TEXT NOT NULL,
  processed_at TEXT NOT NULL
);

PRAGMA optimize;
