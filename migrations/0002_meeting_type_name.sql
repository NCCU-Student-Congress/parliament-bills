ALTER TABLE meetings ADD COLUMN meeting_type_name TEXT NOT NULL DEFAULT '大會';

UPDATE meetings
SET meeting_type_name = COALESCE(
  (SELECT name FROM committees WHERE committees.id = meetings.committee_id),
  '大會'
);
