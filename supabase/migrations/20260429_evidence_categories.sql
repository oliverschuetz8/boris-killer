-- ============================================================
-- Evidence Categories, Subcategories & Template Fields
-- Run this in Supabase SQL Editor manually.
-- ============================================================

-- 1. evidence_categories
CREATE TABLE evidence_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_categories_company_id ON evidence_categories(company_id);

ALTER TABLE evidence_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view evidence_categories"
  ON evidence_categories FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins/Managers can insert evidence_categories"
  ON evidence_categories FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins/Managers can update evidence_categories"
  ON evidence_categories FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete evidence_categories"
  ON evidence_categories FOR DELETE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 2. evidence_subcategories
CREATE TABLE evidence_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES evidence_categories(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_subcategories_company_id ON evidence_subcategories(company_id);
CREATE INDEX idx_evidence_subcategories_category_id ON evidence_subcategories(category_id);

ALTER TABLE evidence_subcategories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view evidence_subcategories"
  ON evidence_subcategories FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins/Managers can insert evidence_subcategories"
  ON evidence_subcategories FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins/Managers can update evidence_subcategories"
  ON evidence_subcategories FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete evidence_subcategories"
  ON evidence_subcategories FOR DELETE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 3. evidence_template_fields
CREATE TABLE evidence_template_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  subcategory_id uuid NOT NULL REFERENCES evidence_subcategories(id) ON DELETE CASCADE,
  label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  options text[],
  required boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  default_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_evidence_template_fields_company_id ON evidence_template_fields(company_id);
CREATE INDEX idx_evidence_template_fields_subcategory_id ON evidence_template_fields(subcategory_id);

ALTER TABLE evidence_template_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view evidence_template_fields"
  ON evidence_template_fields FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins/Managers can insert evidence_template_fields"
  ON evidence_template_fields FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins/Managers can update evidence_template_fields"
  ON evidence_template_fields FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
  );

CREATE POLICY "Admins can delete evidence_template_fields"
  ON evidence_template_fields FOR DELETE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- 4. ALTER jobs — add category/subcategory FKs
ALTER TABLE jobs ADD COLUMN evidence_category_id uuid REFERENCES evidence_categories(id);
ALTER TABLE jobs ADD COLUMN evidence_subcategory_id uuid REFERENCES evidence_subcategories(id);

-- 5. ALTER job_evidence_fields — track template origin
ALTER TABLE job_evidence_fields ADD COLUMN template_field_id uuid REFERENCES evidence_template_fields(id);

-- 6. Seed default categories + subcategories for ALL existing companies
-- (For new companies, call this via a trigger or during onboarding)
DO $$
DECLARE
  comp RECORD;
  cert_id uuid;
  insp_id uuid;
  pen_seal_id uuid;
BEGIN
  FOR comp IN SELECT id FROM companies LOOP
    -- Categories
    INSERT INTO evidence_categories (company_id, name, sort_order)
    VALUES (comp.id, 'Certification', 0)
    RETURNING id INTO cert_id;

    INSERT INTO evidence_categories (company_id, name, sort_order)
    VALUES (comp.id, 'Inspection', 1)
    RETURNING id INTO insp_id;

    -- Subcategories under Certification
    INSERT INTO evidence_subcategories (company_id, category_id, name, sort_order)
    VALUES (comp.id, cert_id, 'Penetration Sealing', 0)
    RETURNING id INTO pen_seal_id;

    INSERT INTO evidence_subcategories (company_id, category_id, name, sort_order)
    VALUES (comp.id, cert_id, 'Fire Collar Installation', 1);

    INSERT INTO evidence_subcategories (company_id, category_id, name, sort_order)
    VALUES (comp.id, cert_id, 'Fire Board Installation', 2);

    -- Subcategories under Inspection
    INSERT INTO evidence_subcategories (company_id, category_id, name, sort_order)
    VALUES (comp.id, insp_id, 'AS1851 Annual Inspection', 0);

    INSERT INTO evidence_subcategories (company_id, category_id, name, sort_order)
    VALUES (comp.id, insp_id, 'AS1851 5-Year Inspection', 1);

    INSERT INTO evidence_subcategories (company_id, category_id, name, sort_order)
    VALUES (comp.id, insp_id, 'Defect Inspection', 2);

    -- Template fields for "Penetration Sealing"
    INSERT INTO evidence_template_fields (company_id, subcategory_id, label, field_type, options, required, sort_order) VALUES
      (comp.id, pen_seal_id, 'Service Type', 'dropdown', ARRAY['Electrical', 'Mechanical', 'Hydraulic', 'Communications', 'Mixed'], true, 0),
      (comp.id, pen_seal_id, 'Service Size', 'text', NULL, true, 1),
      (comp.id, pen_seal_id, 'Seal Method', 'dropdown', ARRAY['Mastic', 'Collar', 'Wrap', 'Mortar', 'Compound', 'Device'], true, 2),
      (comp.id, pen_seal_id, 'FRL Rating', 'dropdown', ARRAY['–/–/–', '–/60/60', '–/120/120', '–/–/60', '–/–/120'], true, 3),
      (comp.id, pen_seal_id, 'Barrier Type', 'dropdown', ARRAY['Wall', 'Floor', 'Ceiling'], true, 4),
      (comp.id, pen_seal_id, 'Comments', 'text', NULL, false, 5);
  END LOOP;
END $$;
