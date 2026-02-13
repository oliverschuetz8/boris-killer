-- =====================================================
-- SEED DATA (For development/testing)
-- =====================================================

-- Insert a demo company
insert into companies (id, name, slug, plan, subscription_status)
values (
  '00000000-0000-0000-0000-000000000001',
  'Demo Construction Ltd',
  'demo-construction',
  'pro',
  'active'
);

-- Note: Users are created through Supabase Auth
-- This seed file just shows the structure
-- You'll create actual users through the signup flow

-- Insert demo customer
insert into customers (
  id,
  company_id,
  name,
  email,
  phone,
  customer_type
)
values (
  '00000000-0000-0000-0000-000000000101',
  '00000000-0000-0000-0000-000000000001',
  'John Smith',
  'john@example.com',
  '+44 7700 900000',
  'individual'
);

-- Insert demo site
insert into customer_sites (
  company_id,
  customer_id,
  site_name,
  address_line1,
  city,
  postcode
)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000101',
  'Main Residence',
  '123 High Street',
  'London',
  'SW1A 1AA'
);