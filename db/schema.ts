export const createWaitlistTableSql = `
  CREATE TABLE IF NOT EXISTS waitlist_signups (
    email TEXT PRIMARY KEY,
    source TEXT NOT NULL DEFAULT 'website',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    name TEXT,
    company TEXT,
    message TEXT,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`;
