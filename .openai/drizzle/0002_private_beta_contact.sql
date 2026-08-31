ALTER TABLE waitlist_signups ADD COLUMN name TEXT;
ALTER TABLE waitlist_signups ADD COLUMN company TEXT;
ALTER TABLE waitlist_signups ADD COLUMN message TEXT;
ALTER TABLE waitlist_signups ADD COLUMN updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP;
