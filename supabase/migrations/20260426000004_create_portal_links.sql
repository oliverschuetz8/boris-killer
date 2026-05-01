-- Portal Links: magic link access for customers to view job evidence
-- No RLS on this table — access is validated via token, not auth session

CREATE TABLE portal_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  is_revoked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid NOT NULL REFERENCES users(id)
);

CREATE INDEX idx_portal_links_token ON portal_links(token);
CREATE INDEX idx_portal_links_job_id ON portal_links(job_id);
CREATE INDEX idx_portal_links_company_id ON portal_links(company_id);

-- NO RLS enabled — portal_links is accessed via service role / security definer functions

-- Function to validate a portal token and return job + company info
-- Called via supabase.rpc('validate_portal_token', { p_token: '...' })
-- SECURITY DEFINER so it bypasses RLS and runs as the function owner
CREATE OR REPLACE FUNCTION validate_portal_token(p_token text)
RETURNS TABLE (
  job_id uuid,
  company_id uuid,
  is_valid boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.job_id,
    pl.company_id,
    true AS is_valid
  FROM portal_links pl
  WHERE pl.token = p_token
    AND pl.is_revoked = false
    AND pl.expires_at > now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to fetch full portal data for a validated token
-- Returns job details as JSON so we can get everything in one call
CREATE OR REPLACE FUNCTION get_portal_job_data(p_token text)
RETURNS json AS $$
DECLARE
  v_job_id uuid;
  v_company_id uuid;
  v_result json;
BEGIN
  -- Validate token first
  SELECT pl.job_id, pl.company_id
  INTO v_job_id, v_company_id
  FROM portal_links pl
  WHERE pl.token = p_token
    AND pl.is_revoked = false
    AND pl.expires_at > now();

  IF v_job_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- Build the full response
  SELECT json_build_object(
    'job', (
      SELECT json_build_object(
        'id', j.id,
        'job_number', j.job_number,
        'title', j.title,
        'description', j.description,
        'status', j.status,
        'priority', j.priority,
        'job_type', j.job_type,
        'scheduled_start', j.scheduled_start,
        'scheduled_end', j.scheduled_end,
        'site_name', j.site_name,
        'site_address_line1', j.site_address_line1,
        'site_city', j.site_city,
        'site_state', j.site_state,
        'site_postcode', j.site_postcode,
        'completed_at', j.completed_at,
        'customer', (
          SELECT json_build_object(
            'name', c.name,
            'email', c.email,
            'phone', c.phone
          )
          FROM customers c WHERE c.id = j.customer_id
        )
      )
      FROM jobs j WHERE j.id = v_job_id
    ),
    'company', (
      SELECT json_build_object(
        'name', co.name
      )
      FROM companies co WHERE co.id = v_company_id
    ),
    'buildings', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', b.id,
          'name', b.name,
          'levels', (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', l.id,
                'name', l.name,
                'order_index', l.order_index,
                'rooms', (
                  SELECT COALESCE(json_agg(
                    json_build_object(
                      'id', r.id,
                      'name', r.name,
                      'is_done', r.is_done
                    ) ORDER BY r.name
                  ), '[]'::json)
                  FROM rooms r WHERE r.level_id = l.id
                )
              ) ORDER BY l.order_index
            ), '[]'::json)
            FROM levels l WHERE l.building_id = b.id
          )
        ) ORDER BY b.name
      ), '[]'::json)
      FROM buildings b WHERE b.site_id = v_job_id
    ),
    'penetrations', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', p.id,
          'field_values', p.field_values,
          'created_at', p.created_at,
          'room_id', p.room_id,
          'level_id', p.level_id,
          'floorplan_x', p.floorplan_x,
          'floorplan_y', p.floorplan_y,
          'floorplan_label', p.floorplan_label,
          'photos', (
            SELECT COALESCE(json_agg(
              json_build_object(
                'id', pp.id,
                'storage_path', pp.storage_path,
                'caption', pp.caption
              )
            ), '[]'::json)
            FROM penetration_photos pp WHERE pp.penetration_id = p.id
          )
        ) ORDER BY p.created_at
      ), '[]'::json)
      FROM penetrations p WHERE p.job_id = v_job_id
    ),
    'evidence_fields', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', ef.id,
          'label', ef.label,
          'order_index', ef.order_index
        ) ORDER BY ef.order_index
      ), '[]'::json)
      FROM job_evidence_fields ef WHERE ef.job_id = v_job_id
    ),
    'level_drawings', (
      SELECT COALESCE(json_agg(
        json_build_object(
          'id', ld.id,
          'level_id', ld.level_id,
          'file_url', ld.file_url,
          'file_name', ld.file_name
        )
      ), '[]'::json)
      FROM level_drawings ld
      WHERE ld.level_id IN (
        SELECT l.id FROM levels l
        JOIN buildings b ON b.id = l.building_id
        WHERE b.site_id = v_job_id
      )
    )
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
