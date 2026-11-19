CREATE TABLE feature_access_events (
  sequence INTEGER PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature TEXT NOT NULL CHECK (feature IN ('portfolio', 'volume_profile', 'market_sentiment')),
  action TEXT NOT NULL CHECK (action IN ('grant', 'revoke')),
  source TEXT NOT NULL CHECK (source IN ('manual', 'payment')),
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL,
  expires_at TEXT,
  CHECK (action = 'grant' OR expires_at IS NULL)
);
CREATE INDEX idx_feature_access_latest ON feature_access_events(user_id, feature, sequence DESC);

CREATE TABLE portfolio_connections (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  revision TEXT NOT NULL,
  encrypted_credentials TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('saved', 'connected', 'invalid')),
  updated_at TEXT NOT NULL
);

CREATE TABLE portfolio_runs (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  id TEXT NOT NULL,
  connection_revision TEXT NOT NULL,
  started_at TEXT NOT NULL,
  finished_at TEXT,
  result_json TEXT,
  PRIMARY KEY (user_id, id)
);
CREATE INDEX idx_portfolio_runs_account ON portfolio_runs(user_id, started_at DESC);
CREATE UNIQUE INDEX idx_portfolio_runs_pending ON portfolio_runs(user_id) WHERE finished_at IS NULL;
