-- Add default_value to job_evidence_fields for pre-filling worker forms
ALTER TABLE job_evidence_fields ADD COLUMN IF NOT EXISTS default_value text;
