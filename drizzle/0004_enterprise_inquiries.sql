CREATE TABLE enterprise_inquiries (
  id TEXT PRIMARY KEY NOT NULL,
  contact_name TEXT NOT NULL CHECK (length(contact_name) BETWEEN 1 AND 120),
  work_email TEXT NOT NULL CHECK (length(work_email) BETWEEN 3 AND 254),
  company TEXT NOT NULL CHECK (length(company) BETWEEN 1 AND 180),
  role TEXT,
  team_size TEXT,
  needs_json TEXT NOT NULL,
  timeline TEXT,
  message TEXT NOT NULL CHECK (length(message) BETWEEN 10 AND 4000),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewing', 'contacted', 'closed')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_enterprise_inquiries_status_created
ON enterprise_inquiries(status, created_at DESC);

PRAGMA optimize;
