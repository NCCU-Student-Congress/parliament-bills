CREATE TABLE proposals_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  committee_id INTEGER,
  session INTEGER NOT NULL,
  proposed_at TEXT NOT NULL,
  proposer_id INTEGER NOT NULL,
  meeting_id INTEGER,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (committee_id) REFERENCES committees (id) ON DELETE SET NULL,
  FOREIGN KEY (session) REFERENCES sessions (id) ON DELETE RESTRICT,
  FOREIGN KEY (proposer_id) REFERENCES users (id) ON DELETE RESTRICT,
  FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE RESTRICT
);

INSERT INTO proposals_new (
  id, committee_id, session, proposed_at, proposer_id, meeting_id,
  subject, description, created_at, updated_at
)
SELECT id, committee_id, session, proposed_at, proposer_id, meeting_id,
       subject, description, created_at, updated_at
FROM proposals;

CREATE TABLE proposal_attachments_backup AS SELECT * FROM proposal_attachments;
CREATE TABLE proposal_cosponsors_backup AS SELECT * FROM proposal_cosponsors;

DROP TABLE proposal_attachments;
DROP TABLE proposal_cosponsors;
DROP TABLE proposals;
ALTER TABLE proposals_new RENAME TO proposals;

CREATE INDEX proposals_committee_session_idx ON proposals (committee_id, session);
CREATE INDEX proposals_session_idx ON proposals (session);
CREATE INDEX proposals_proposed_at_idx ON proposals (proposed_at);
CREATE INDEX proposals_proposer_id_idx ON proposals (proposer_id);
CREATE INDEX proposals_meeting_id_idx ON proposals (meeting_id);

CREATE TABLE proposal_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('file', 'link')),
  url TEXT NOT NULL,
  r2_key TEXT,
  filename TEXT,
  mime_type TEXT,
  size_bytes INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE
);

INSERT INTO proposal_attachments (
  id, proposal_id, kind, url, r2_key, filename, mime_type, size_bytes, created_at
)
SELECT id, proposal_id, kind, url, r2_key, filename, mime_type, size_bytes, created_at
FROM proposal_attachments_backup;

CREATE INDEX proposal_attachments_proposal_id_idx ON proposal_attachments (proposal_id);

CREATE TABLE proposal_cosponsors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'declined', 'expired', 'cancelled')),
  invited_at TEXT,
  confirmed_at TEXT,
  declined_at TEXT,
  token_hash TEXT,
  token_expires_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (proposal_id) REFERENCES proposals (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  UNIQUE (proposal_id, user_id)
);

INSERT INTO proposal_cosponsors (
  id, proposal_id, user_id, status, invited_at, confirmed_at, declined_at,
  token_hash, token_expires_at, created_at, updated_at
)
SELECT id, proposal_id, user_id, status, invited_at, confirmed_at, declined_at,
       token_hash, token_expires_at, created_at, updated_at
FROM proposal_cosponsors_backup;

CREATE INDEX proposal_cosponsors_proposal_id_idx ON proposal_cosponsors (proposal_id);
CREATE INDEX proposal_cosponsors_user_id_idx ON proposal_cosponsors (user_id);
CREATE INDEX proposal_cosponsors_status_idx ON proposal_cosponsors (status);

DROP TABLE proposal_attachments_backup;
DROP TABLE proposal_cosponsors_backup;
