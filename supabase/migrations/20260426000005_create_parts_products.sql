-- ============================================================
-- Parts & Products System
-- Replaces the flat materials catalogue with:
--   parts = individual purchasable items
--   products = bundles of parts
--   product_parts = join table
-- Also extends job_material_defaults with part_id / product_id
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. PARTS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  subcategory text,
  unit text NOT NULL DEFAULT 'each',
  buy_cost numeric(10,2),
  sell_price numeric(10,2),
  margin numeric(5,2),
  supplier text,
  part_number text,
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_parts_company_id ON parts(company_id);
CREATE INDEX idx_parts_subcategory ON parts(company_id, subcategory);

ALTER TABLE parts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view parts"
  ON parts FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins/Managers can create parts"
  ON parts FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins/Managers can update parts"
  ON parts FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins/Managers can delete parts"
  ON parts FOR DELETE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

-- Auto-update updated_at
CREATE TRIGGER update_parts_updated_at
  BEFORE UPDATE ON parts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 2. PRODUCTS TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id),
  name text NOT NULL,
  description text,
  total_buy_cost numeric(10,2),
  total_sell_price numeric(10,2),
  margin numeric(5,2),
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_products_company_id ON products(company_id);

ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company users can view products"
  ON products FOR SELECT
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins/Managers can create products"
  ON products FOR INSERT
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins/Managers can update products"
  ON products FOR UPDATE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins/Managers can delete products"
  ON products FOR DELETE
  USING (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ─────────────────────────────────────────────────────────────
-- 3. PRODUCT_PARTS JOIN TABLE
-- ─────────────────────────────────────────────────────────────

CREATE TABLE product_parts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  part_id uuid NOT NULL REFERENCES parts(id),
  quantity numeric(10,2) NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_parts_product_id ON product_parts(product_id);
CREATE INDEX idx_product_parts_part_id ON product_parts(part_id);

ALTER TABLE product_parts ENABLE ROW LEVEL SECURITY;

-- product_parts inherits access from products via the product_id join
CREATE POLICY "Company users can view product_parts"
  ON product_parts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_parts.product_id
      AND products.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "Admins/Managers can create product_parts"
  ON product_parts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_parts.product_id
      AND products.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins/Managers can update product_parts"
  ON product_parts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_parts.product_id
      AND products.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );

CREATE POLICY "Admins/Managers can delete product_parts"
  ON product_parts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_parts.product_id
      AND products.company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
    AND EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'manager')
    )
  );


-- ─────────────────────────────────────────────────────────────
-- 4. EXTEND job_material_defaults WITH part_id / product_id
-- ─────────────────────────────────────────────────────────────

ALTER TABLE job_material_defaults
  ADD COLUMN part_id uuid REFERENCES parts(id),
  ADD COLUMN product_id uuid REFERENCES products(id);


-- ─────────────────────────────────────────────────────────────
-- 5. EXTEND room_materials WITH part_id / product_id
-- ─────────────────────────────────────────────────────────────

ALTER TABLE room_materials
  ADD COLUMN part_id uuid REFERENCES parts(id),
  ADD COLUMN product_id uuid REFERENCES products(id);
