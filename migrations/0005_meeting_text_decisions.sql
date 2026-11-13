ALTER TABLE meeting_agenda_entries ADD COLUMN decision_key TEXT;

UPDATE meeting_agenda_entries
SET decision_key = 'legacy-' || id
WHERE kind = 'text';

CREATE UNIQUE INDEX meeting_agenda_entry_decision_key_idx
ON meeting_agenda_entries (meeting_id, decision_key)
WHERE decision_key IS NOT NULL;

CREATE TABLE meeting_text_decisions (
  meeting_id INTEGER NOT NULL REFERENCES meetings (id) ON DELETE CASCADE,
  decision_key TEXT NOT NULL,
  decision TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (meeting_id, decision_key)
);
