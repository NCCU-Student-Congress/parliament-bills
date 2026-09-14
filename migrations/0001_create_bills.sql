CREATE TABLE IF NOT EXISTS committees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  code TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  permission_role TEXT NOT NULL DEFAULT 'viewer',
  committee_ids TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(committee_ids)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS users_permission_role_idx ON users (permission_role);

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  committee_id INTEGER NOT NULL,
  session INTEGER NOT NULL,
  meeting_date TEXT NOT NULL,
  proposal_deadline_at TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (committee_id) REFERENCES committees (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS meetings_committee_session_idx ON meetings (committee_id, session);
CREATE INDEX IF NOT EXISTS meetings_session_idx ON meetings (session);
CREATE INDEX IF NOT EXISTS meetings_proposal_deadline_at_idx ON meetings (proposal_deadline_at);

CREATE TABLE IF NOT EXISTS proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  committee_id INTEGER NOT NULL,
  session INTEGER NOT NULL,
  proposed_at TEXT NOT NULL,
  proposer_id INTEGER NOT NULL,
  meeting_id INTEGER NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (committee_id) REFERENCES committees (id) ON DELETE RESTRICT,
  FOREIGN KEY (proposer_id) REFERENCES users (id) ON DELETE RESTRICT,
  FOREIGN KEY (meeting_id) REFERENCES meetings (id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS proposals_committee_session_idx ON proposals (committee_id, session);
CREATE INDEX IF NOT EXISTS proposals_session_idx ON proposals (session);
CREATE INDEX IF NOT EXISTS proposals_proposed_at_idx ON proposals (proposed_at);
CREATE INDEX IF NOT EXISTS proposals_proposer_id_idx ON proposals (proposer_id);
CREATE INDEX IF NOT EXISTS proposals_meeting_id_idx ON proposals (meeting_id);

CREATE TABLE IF NOT EXISTS proposal_attachments (
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

CREATE INDEX IF NOT EXISTS proposal_attachments_proposal_id_idx
  ON proposal_attachments (proposal_id);

CREATE TABLE IF NOT EXISTS proposal_cosponsors (
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

CREATE INDEX IF NOT EXISTS proposal_cosponsors_proposal_id_idx
  ON proposal_cosponsors (proposal_id);
CREATE INDEX IF NOT EXISTS proposal_cosponsors_user_id_idx
  ON proposal_cosponsors (user_id);
CREATE INDEX IF NOT EXISTS proposal_cosponsors_status_idx
  ON proposal_cosponsors (status);
