CREATE TABLE monthly_research (
  period TEXT NOT NULL CHECK (length(period) = 7),
  kind TEXT NOT NULL CHECK (kind IN ('stock_analysis', 'market_outlook')),
  title TEXT NOT NULL CHECK (length(title) BETWEEN 1 AND 180),
  summary TEXT NOT NULL CHECK (length(summary) BETWEEN 1 AND 600),
  body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 20000),
  evidence_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (period, kind)
);

CREATE INDEX idx_monthly_research_status_period
ON monthly_research(status, period DESC);

PRAGMA optimize;
