-- Add floorplan_label for free-text pin labels on penetrations
ALTER TABLE penetrations ADD COLUMN IF NOT EXISTS floorplan_label text;
