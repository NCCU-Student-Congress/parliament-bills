CREATE TABLE committees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  email TEXT NOT NULL UNIQUE CHECK (length(trim(email)) > 0),
  permission_role TEXT NOT NULL DEFAULT 'legislator'
    CHECK (permission_role IN ('legislator', 'secretariat_admin')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_committees (
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  committee_id INTEGER NOT NULL REFERENCES committees (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, committee_id)
);
CREATE INDEX user_committees_committee_idx ON user_committees (committee_id, user_id);

CREATE TABLE auth_login_tokens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  redirect_path TEXT,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX auth_login_tokens_expires_at_idx ON auth_login_tokens (expires_at);

CREATE TABLE sessions (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  starts_at TEXT,
  ends_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  committee_id INTEGER REFERENCES committees (id) ON DELETE SET NULL,
  meeting_type_name TEXT NOT NULL CHECK (length(trim(meeting_type_name)) > 0),
  session INTEGER NOT NULL REFERENCES sessions (id) ON DELETE RESTRICT,
  meeting_date TEXT NOT NULL,
  proposal_deadline_at TEXT NOT NULL CHECK (proposal_deadline_at <= meeting_date),
  title TEXT NOT NULL CHECK (length(trim(title)) > 0),
  location TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX meetings_committee_session_idx ON meetings (committee_id, session);
CREATE INDEX meetings_session_date_idx ON meetings (session, meeting_date);

CREATE TABLE proposals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_type TEXT NOT NULL DEFAULT 'discussion'
    CHECK (proposal_type IN ('discussion', 'report', 'election')),
  committee_id INTEGER REFERENCES committees (id) ON DELETE SET NULL,
  session INTEGER NOT NULL REFERENCES sessions (id) ON DELETE RESTRICT,
  proposed_at TEXT NOT NULL,
  proposer_id INTEGER NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  subject TEXT NOT NULL CHECK (length(trim(subject)) > 0),
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX proposals_committee_session_idx ON proposals (committee_id, session);
CREATE INDEX proposals_session_date_idx ON proposals (session, proposed_at DESC, id DESC);
CREATE INDEX proposals_proposer_idx ON proposals (proposer_id);

CREATE TABLE proposal_meetings (
  proposal_id INTEGER NOT NULL REFERENCES proposals (id) ON DELETE CASCADE,
  meeting_id INTEGER NOT NULL REFERENCES meetings (id) ON DELETE RESTRICT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (proposal_id, meeting_id)
);
CREATE INDEX proposal_meetings_meeting_idx ON proposal_meetings (meeting_id, proposal_id);

CREATE TABLE proposal_attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  proposal_id INTEGER NOT NULL REFERENCES proposals (id) ON DELETE CASCADE,
  name TEXT NOT NULL CHECK (length(trim(name)) > 0),
  url TEXT NOT NULL CHECK (length(trim(url)) > 0),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (proposal_id, url)
);

CREATE TABLE proposal_cosponsors (
  proposal_id INTEGER NOT NULL REFERENCES proposals (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  signed_at TEXT,
  PRIMARY KEY (proposal_id, user_id)
);
CREATE INDEX proposal_cosponsors_user_idx ON proposal_cosponsors (user_id);

CREATE TABLE meeting_agenda_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  position INTEGER NOT NULL CHECK (position >= 0),
  kind TEXT NOT NULL CHECK (kind IN ('heading', 'text', 'proposal')),
  content TEXT NOT NULL DEFAULT '',
  proposal_id INTEGER REFERENCES proposals (id) ON DELETE CASCADE,
  decision_key TEXT,
  decision TEXT,
  CHECK (
    (kind = 'proposal' AND proposal_id IS NOT NULL AND content = '' AND decision_key IS NULL AND decision IS NULL)
    OR (kind = 'heading' AND proposal_id IS NULL AND length(trim(content)) > 0 AND decision_key IS NULL AND decision IS NULL)
    OR (kind = 'text' AND proposal_id IS NULL AND length(trim(content)) > 0 AND decision_key IS NOT NULL)
  ),
  UNIQUE (meeting_id, position),
  UNIQUE (meeting_id, proposal_id),
  UNIQUE (meeting_id, decision_key)
);

CREATE TABLE meeting_proposal_decisions (
  meeting_id INTEGER NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  proposal_id INTEGER NOT NULL REFERENCES proposals (id) ON DELETE CASCADE,
  decision TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_id, proposal_id)
);
