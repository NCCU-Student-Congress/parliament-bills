CREATE TABLE proposal_attachments_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  name TEXT,
  url TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE
);

INSERT INTO proposal_attachments_new (id, proposal_id, name, url, created_at)
SELECT id, proposal_id, NULLIF(TRIM(filename), ''), url, created_at
FROM proposal_attachments;

DROP TABLE proposal_attachments;
ALTER TABLE proposal_attachments_new RENAME TO proposal_attachments;

CREATE INDEX proposal_attachments_proposal_id_idx
  ON proposal_attachments (proposal_id);
