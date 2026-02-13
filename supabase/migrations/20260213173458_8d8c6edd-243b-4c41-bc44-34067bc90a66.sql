
-- Add unique constraint on mailing_groups.committee_id to prevent duplicates
-- First clean any remaining duplicates
DELETE FROM mailing_groups a USING mailing_groups b
WHERE a.id > b.id AND a.committee_id = b.committee_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mailing_groups_committee_unique ON mailing_groups(committee_id) WHERE committee_id IS NOT NULL;
