ALTER TABLE users ADD COLUMN billing_event_created INTEGER NOT NULL DEFAULT 0;

PRAGMA optimize;
