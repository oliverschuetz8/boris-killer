-- Add job_type to jobs: installation, maintenance, inspection
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT 'installation';
