ALTER TABLE proposals ADD COLUMN proposal_type TEXT NOT NULL DEFAULT 'discussion'
  CHECK (proposal_type IN ('discussion', 'report', 'election'));
