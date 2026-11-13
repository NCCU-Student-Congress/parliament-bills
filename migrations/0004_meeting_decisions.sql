CREATE TABLE meeting_proposal_decisions (
  meeting_id INTEGER NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  proposal_id INTEGER NOT NULL REFERENCES proposals (id) ON DELETE CASCADE,
  decision TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_id, proposal_id)
);
