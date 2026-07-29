-- Agency reference, consent, opt-out, narrowed public surface, status RPC, staff photo publish.
-- NOT applied until reviewed.

-- =============================================================================
-- 1. tickets columns
-- =============================================================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS agency text,
  ADD COLUMN IF NOT EXISTS agency_ref text,
  ADD COLUMN IF NOT EXISTS agency_reported_at date,
  ADD COLUMN IF NOT EXISTS publish_agency_ref boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS public_display_opt_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS messaging_opted_out boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_given_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version text DEFAULT '2026-07-29',
  ADD COLUMN IF NOT EXISTS photo_public boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.tickets.photo_public IS
  'Staff must set true before photo_url is exposed via public_ticket_photos. Default false.';

-- =============================================================================
-- 2. Session fields for intake steps
-- =============================================================================
ALTER TABLE public.conversation_sessions
  ADD COLUMN IF NOT EXISTS agency text,
  ADD COLUMN IF NOT EXISTS agency_ref text,
  ADD COLUMN IF NOT EXISTS agency_reported_at date,
  ADD COLUMN IF NOT EXISTS publish_agency_ref boolean,
  ADD COLUMN IF NOT EXISTS public_display_opt_out boolean,
  ADD COLUMN IF NOT EXISTS consent_given_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version text;

-- =============================================================================
-- 3. Per-number messaging preference (STOP before any ticket exists)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messaging_preferences (
  whatsapp_number text PRIMARY KEY,
  messaging_opted_out boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.whatsapp_messaging_preferences ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.whatsapp_messaging_preferences FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.whatsapp_messaging_preferences FROM authenticated;

-- =============================================================================
-- 4. Deletion requests (PADAM / DELETE)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.deletion_requests (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  whatsapp_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verified', 'completed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes text
);

CREATE INDEX IF NOT EXISTS deletion_requests_whatsapp_number_idx
  ON public.deletion_requests (whatsapp_number);

CREATE INDEX IF NOT EXISTS deletion_requests_status_created_idx
  ON public.deletion_requests (status, created_at DESC);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.deletion_requests FROM anon;

DROP POLICY IF EXISTS "staff_select_deletion_requests" ON public.deletion_requests;
CREATE POLICY "staff_select_deletion_requests"
  ON public.deletion_requests
  FOR SELECT
  TO authenticated
  USING (public.current_staff_is_active());

GRANT SELECT ON TABLE public.deletion_requests TO authenticated;

-- =============================================================================
-- 5. public_tickets — parents only; minimal columns; no ticket_number / description / photos
--    report_count = parent upvote_count
--    first_reported_at / days_outstanding from agency_reported_at only (null stays null)
--    Children (parent_ticket_id IS NOT NULL) are excluded so they are not separate pins
-- =============================================================================
DROP VIEW IF EXISTS public.public_tickets;
-- security_invoker = false: view runs as owner so anon can read the filtered public surface
-- while RLS on public.tickets denies anon direct SELECT.
CREATE VIEW public.public_tickets
WITH (security_invoker = false)
AS
SELECT
  p.id,
  p.category,
  p.status,
  round(p.latitude::numeric, 4)::double precision AS latitude,
  round(p.longitude::numeric, 4)::double precision AS longitude,
  p.agency,
  p.upvote_count AS report_count,
  p.agency_reported_at AS first_reported_at,
  CASE
    WHEN p.agency_reported_at IS NULL THEN NULL
    ELSE (CURRENT_DATE - p.agency_reported_at)
  END AS days_outstanding,
  p.parent_ticket_id
FROM public.tickets p
WHERE p.is_public = true
  AND p.public_display_opt_out = false
  AND p.parent_ticket_id IS NULL;

COMMENT ON VIEW public.public_tickets IS
  'WARNING: Must keep security_invoker = false. Anon SELECT on this view must run as owner while RLS on public.tickets denies anon direct table access; security_invoker = true returns empty map for visitors. Public map pins: parent tickets only. Columns: id, category, status, rounded lat/lng, agency, report_count (parent upvote_count), first_reported_at (agency_reported_at), days_outstanding, parent_ticket_id. No ticket_number, agency_ref, description, or photos. Excludes public_display_opt_out. Keep free of PII.';

REVOKE ALL ON TABLE public.public_tickets FROM PUBLIC;
REVOKE ALL ON TABLE public.public_tickets FROM anon;
GRANT SELECT ON TABLE public.public_tickets TO anon;
GRANT SELECT ON TABLE public.public_tickets TO authenticated;

-- =============================================================================
-- 6. Approved photos only — never via public_tickets
-- =============================================================================
DROP VIEW IF EXISTS public.public_ticket_photos;
-- security_invoker = false: same owner-run pattern as public_tickets (anon RLS on tickets).
CREATE VIEW public.public_ticket_photos
WITH (security_invoker = false)
AS
SELECT
  t.id AS ticket_id,
  coalesce(t.parent_ticket_id, t.id) AS root_ticket_id,
  t.photo_url
FROM public.tickets t
JOIN public.tickets root
  ON root.id = coalesce(t.parent_ticket_id, t.id)
WHERE t.photo_public = true
  AND t.photo_url IS NOT NULL
  AND t.is_public = true
  AND t.public_display_opt_out = false
  AND root.is_public = true
  AND root.public_display_opt_out = false
  AND root.parent_ticket_id IS NULL;

COMMENT ON VIEW public.public_ticket_photos IS
  'WARNING: Must keep security_invoker = false. Anon SELECT on this view must run as owner while RLS on public.tickets denies anon direct table access; security_invoker = true returns no photos for visitors. Staff-approved photos only (photo_public = true). Join to public_tickets.id via root_ticket_id.';

REVOKE ALL ON TABLE public.public_ticket_photos FROM PUBLIC;
REVOKE ALL ON TABLE public.public_ticket_photos FROM anon;
GRANT SELECT ON TABLE public.public_ticket_photos TO anon;
GRANT SELECT ON TABLE public.public_ticket_photos TO authenticated;

-- =============================================================================
-- 7. get_ticket_status — exact ticket_number match for Semak (anon)
-- =============================================================================
DROP FUNCTION IF EXISTS public.get_ticket_status(text);

CREATE OR REPLACE FUNCTION public.get_ticket_status(p_ticket_number text)
RETURNS TABLE (
  category public.issue_category,
  status public.ticket_status,
  first_reported_at date,
  days_outstanding integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
begin
  return query
  select
    t.category,
    t.status,
    t.agency_reported_at as first_reported_at,
    case
      when t.agency_reported_at is null then null
      else (current_date - t.agency_reported_at)
    end as days_outstanding
  from public.tickets t
  where t.ticket_number = upper(trim(p_ticket_number))
  limit 1;
end;
$function$;

REVOKE ALL ON FUNCTION public.get_ticket_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_status(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_ticket_status(text) TO authenticated;

COMMENT ON FUNCTION public.get_ticket_status(text) IS
  'Public Semak lookup by exact ticket_number. Returns category, status, first_reported_at, days_outstanding only.';

-- =============================================================================
-- 8. staff_tickets_safe — agency + photo_public + days_outstanding
--    Keep security_invoker = false (owner) so viewers can read non-PII.
-- =============================================================================
DROP VIEW IF EXISTS public.staff_tickets_safe;
CREATE VIEW public.staff_tickets_safe
WITH (security_invoker = false)
AS
SELECT
  t.id,
  t.ticket_number,
  t.language,
  t.category,
  t.description,
  t.photo_url,
  t.photo_public,
  t.latitude,
  t.longitude,
  t.address_text,
  t.status,
  t.adun_priority,
  t.is_public,
  t.parent_ticket_id,
  t.upvote_count,
  t.created_at,
  t.updated_at,
  t.agency,
  t.agency_ref,
  t.agency_reported_at,
  t.publish_agency_ref,
  t.public_display_opt_out,
  CASE
    WHEN t.agency_reported_at IS NULL THEN NULL
    ELSE (CURRENT_DATE - t.agency_reported_at)
  END AS days_outstanding
FROM public.tickets t
WHERE public.current_staff_is_active();

COMMENT ON VIEW public.staff_tickets_safe IS
  'WARNING: Must keep security_invoker = false. Active staff (including viewers) read non-PII ticket fields here while RLS on public.tickets denies viewers direct SELECT of name/whatsapp_number.';

REVOKE ALL ON TABLE public.staff_tickets_safe FROM PUBLIC;
REVOKE ALL ON TABLE public.staff_tickets_safe FROM anon;
GRANT SELECT ON TABLE public.staff_tickets_safe TO authenticated;

-- =============================================================================
-- 9. create_or_link_ticket — DROP old 12-param overload, then recreate
--
-- G (silent-break fix): PostgreSQL treats a longer parameter list as a NEW
-- overload. CREATE OR REPLACE alone leaves the old twelve-parameter function
-- in place; PostgREST / the Edge Function can keep calling the stale body
-- (missing agency/consent columns, and historically wrong search_path).
-- We DROP the old signature explicitly, then CREATE with SECURITY DEFINER
-- and SET search_path = public, extensions.
-- =============================================================================

-- Old live signature (12 args), from migrations through 20260729010000:
DROP FUNCTION IF EXISTS public.create_or_link_ticket(
  text,                -- p_whatsapp_number
  issue_category,      -- p_category
  text,                -- p_description
  double precision,    -- p_latitude
  double precision,    -- p_longitude
  text,                -- p_name
  input_language,      -- p_language
  text,                -- p_photo_url
  text,                -- p_voice_note_url
  text,                -- p_whatsapp_message_id
  text,                -- p_address_text
  boolean              -- p_contactable
);

CREATE OR REPLACE FUNCTION public.create_or_link_ticket(
  p_whatsapp_number text,
  p_category issue_category,
  p_description text,
  p_latitude double precision,
  p_longitude double precision,
  p_name text DEFAULT NULL::text,
  p_language input_language DEFAULT 'ms'::input_language,
  p_photo_url text DEFAULT NULL::text,
  p_voice_note_url text DEFAULT NULL::text,
  p_whatsapp_message_id text DEFAULT NULL::text,
  p_address_text text DEFAULT NULL::text,
  p_contactable boolean DEFAULT true,
  p_agency text DEFAULT NULL::text,
  p_agency_ref text DEFAULT NULL::text,
  p_agency_reported_at date DEFAULT NULL::date,
  p_publish_agency_ref boolean DEFAULT true,
  p_public_display_opt_out boolean DEFAULT false,
  p_consent_given_at timestamptz DEFAULT NULL::timestamptz,
  p_consent_version text DEFAULT '2026-07-29'::text
)
RETURNS tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
declare
  v_existing record;
  v_parent_id bigint;
  v_year_month text;
  v_seq int;
  v_ticket_number text;
  v_new_point geometry;
  v_result public.tickets;
  v_is_public boolean;
begin
  if p_whatsapp_message_id is not null then
    select * into v_result from public.tickets where whatsapp_message_id = p_whatsapp_message_id;
    if found then
      return v_result;
    end if;
  end if;

  if p_latitude is not null and p_longitude is not null then
    v_new_point := st_setsrid(st_makepoint(p_longitude, p_latitude), 4326);
  else
    v_new_point := null;
  end if;

  -- D: dedup radius unchanged at 15 metres
  select * into v_existing
  from public.tickets
  where category = p_category
    and status <> 'selesai'
    and v_new_point is not null
    and st_dwithin(geom::geography, v_new_point::geography, 15)
  order by created_at asc
  limit 1;

  if found then
    v_parent_id := coalesce(v_existing.parent_ticket_id, v_existing.id);

    select ticket_number into v_ticket_number
    from public.tickets where id = v_parent_id;

    v_ticket_number := v_ticket_number || '-' ||
      (select (count(*) + 2)::text from public.tickets where parent_ticket_id = v_parent_id);

    update public.tickets
    set upvote_count = upvote_count + 1
    where id = v_parent_id;
  else
    v_parent_id := null;
    v_year_month := to_char(now() at time zone 'Asia/Kuala_Lumpur', 'YYMM');

    insert into public.ticket_sequences (year_month, last_number)
    values (v_year_month, 1)
    on conflict (year_month)
      do update set last_number = ticket_sequences.last_number + 1
    returning last_number into v_seq;

    v_ticket_number := 'ADU-' || v_year_month || '-' || lpad(v_seq::text, 4, '0');
  end if;

  v_is_public := not coalesce(p_public_display_opt_out, false);

  -- upvote_count: column default is 1; set explicitly so a new parent never shows report_count 0.
  -- Linked children still insert with 1 on their own row; parent upvote is incremented above.
  insert into public.tickets (
    ticket_number, whatsapp_number, name, language, category, description,
    photo_url, voice_note_url, latitude, longitude, address_text,
    parent_ticket_id, whatsapp_message_id, contactable,
    upvote_count,
    agency, agency_ref, agency_reported_at, publish_agency_ref,
    public_display_opt_out, is_public,
    consent_given_at, consent_version,
    photo_public
  ) values (
    v_ticket_number, p_whatsapp_number, p_name, p_language, p_category, p_description,
    p_photo_url, p_voice_note_url, p_latitude, p_longitude, p_address_text,
    v_parent_id, p_whatsapp_message_id, p_contactable,
    1,
    p_agency, p_agency_ref, p_agency_reported_at, coalesce(p_publish_agency_ref, true),
    coalesce(p_public_display_opt_out, false), v_is_public,
    p_consent_given_at, coalesce(p_consent_version, '2026-07-29'),
    false
  )
  returning * into v_result;

  return v_result;
end;
$function$;

COMMENT ON FUNCTION public.create_or_link_ticket(
  text, issue_category, text, double precision, double precision,
  text, input_language, text, text, text, text, boolean,
  text, text, date, boolean, boolean, timestamptz, text
) IS
  'SECURITY DEFINER; search_path = public, extensions. Old 12-arg overload was DROPped in this migration. Dedup radius 15m. photo_public always inserted as false.';
