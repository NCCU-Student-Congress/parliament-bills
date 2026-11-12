-- Rebuild committees because its code column has a UNIQUE constraint.
-- Dropping the parent table sets referencing committee_id values to NULL,
-- so save and restore those references within this migration.
PRAGMA defer_foreign_keys = ON;

CREATE TABLE committee_meeting_refs AS
SELECT id, committee_id FROM meetings WHERE committee_id IS NOT NULL;

CREATE TABLE committee_proposal_refs AS
SELECT id, committee_id FROM proposals WHERE committee_id IS NOT NULL;

CREATE TABLE committees_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO committees_new (id, name, created_at, updated_at)
SELECT id, name, created_at, updated_at FROM committees;

DROP TABLE committees;
ALTER TABLE committees_new RENAME TO committees;

UPDATE meetings
SET committee_id = (SELECT committee_id FROM committee_meeting_refs WHERE committee_meeting_refs.id = meetings.id)
WHERE id IN (SELECT id FROM committee_meeting_refs);

UPDATE proposals
SET committee_id = (SELECT committee_id FROM committee_proposal_refs WHERE committee_proposal_refs.id = proposals.id)
WHERE id IN (SELECT id FROM committee_proposal_refs);

DROP TABLE committee_meeting_refs;
DROP TABLE committee_proposal_refs;

PRAGMA foreign_key_check;
