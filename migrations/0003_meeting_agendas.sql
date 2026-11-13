CREATE TABLE meeting_agenda_entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('heading', 'text', 'proposal')),
  content TEXT NOT NULL DEFAULT '',
  proposal_id INTEGER REFERENCES proposals (id) ON DELETE CASCADE,
  CHECK ((kind = 'proposal' AND proposal_id IS NOT NULL AND content = '') OR
         (kind <> 'proposal' AND proposal_id IS NULL AND length(trim(content)) > 0)),
  UNIQUE (meeting_id, position),
  UNIQUE (meeting_id, proposal_id)
);

CREATE INDEX meeting_agenda_entries_meeting_idx ON meeting_agenda_entries (meeting_id, position);
