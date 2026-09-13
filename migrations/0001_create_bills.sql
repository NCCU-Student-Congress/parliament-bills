CREATE TABLE IF NOT EXISTS bills (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  row_index INTEGER NOT NULL UNIQUE,
  bill_number TEXT NOT NULL DEFAULT '',
  term INTEGER,
  serial_number INTEGER,
  submitted_at TEXT NOT NULL DEFAULT '',
  proposing_entity TEXT NOT NULL DEFAULT '',
  proposer_name TEXT NOT NULL DEFAULT '',
  contact_name TEXT NOT NULL DEFAULT '',
  bill_type TEXT NOT NULL DEFAULT '',
  subject TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  proposed_action TEXT NOT NULL DEFAULT '',
  scheduled_session TEXT NOT NULL DEFAULT '',
  cached_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS bills_term_serial_number_idx
  ON bills (term, serial_number)
  WHERE term IS NOT NULL AND serial_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS bills_term_idx ON bills (term);
CREATE INDEX IF NOT EXISTS bills_row_index_idx ON bills (row_index);
CREATE INDEX IF NOT EXISTS bills_bill_type_idx ON bills (bill_type);
CREATE INDEX IF NOT EXISTS bills_submitted_at_idx ON bills (submitted_at);

CREATE TABLE IF NOT EXISTS bill_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  bill_id INTEGER NOT NULL,
  position INTEGER NOT NULL,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (bill_id) REFERENCES bills (id) ON DELETE CASCADE,
  UNIQUE (bill_id, position)
);

CREATE INDEX IF NOT EXISTS bill_attachments_bill_id_idx ON bill_attachments (bill_id);
