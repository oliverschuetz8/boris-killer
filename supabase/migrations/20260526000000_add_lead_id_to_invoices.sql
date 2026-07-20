-- ============================================================================
-- Link invoices back to the lead they were quoted from
-- Enables the lead-pipeline "quote state" derived view: each lead's quote
-- status comes from the latest invoice with lead_id pointing at it.
-- ============================================================================

ALTER TABLE invoices
  ADD COLUMN lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX idx_invoices_lead_id
  ON invoices(lead_id)
  WHERE lead_id IS NOT NULL;
