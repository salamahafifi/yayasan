-- Phase 3: required locations, case-management views, per-photo publishing,
-- and removal of the deprecated ticket-level photo_public flag.

-- Views/functions that depend on columns changed below.
DROP VIEW IF EXISTS public.public_tickets;
DROP VIEW IF EXISTS public.staff_tickets_safe;
DROP FUNCTION IF EXISTS public.create_or_link_ticket(
  text, issue_category, text, double precision, double precision,
  text, input_language, text, text, text, text, boolean,
  text, text, date, boolean, boolean, timestamptz, text
);

ALTER TABLE public.tickets
  ADD COLUMN location_source text,
  ADD COLUMN needs_location boolean
    GENERATED ALWAYS AS (latitude IS NULL) STORED;

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_location_source_check
    CHECK (location_source IS NULL OR location_source IN ('pin', 'geocoded', 'staff')),
  ADD CONSTRAINT tickets_coordinate_pair_check
    CHECK ((latitude IS NULL) = (longitude IS NULL));

ALTER TABLE public.conversation_sessions
  ADD COLUMN IF NOT EXISTS location_source text,
  ADD CONSTRAINT conversation_sessions_location_source_check
    CHECK (location_source IS NULL OR location_source IN ('pin', 'geocoded'));

COMMENT ON COLUMN public.tickets.location_source IS
  'How coordinates were obtained: WhatsApp pin, geocoded typed address, or staff placement.';
COMMENT ON COLUMN public.tickets.needs_location IS
  'Derived from latitude IS NULL. Legacy/incomplete cases remain visible to staff and public counts.';

-- Reserve globally spaced Nominatim request slots across Edge Function isolates.
CREATE TABLE public.nominatim_rate_limit (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  next_request_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.nominatim_rate_limit (singleton)
VALUES (true)
ON CONFLICT (singleton) DO NOTHING;

ALTER TABLE public.nominatim_rate_limit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.nominatim_rate_limit FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.reserve_nominatim_slot()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
declare
  v_now timestamptz := clock_timestamp();
  v_slot timestamptz;
begin
  perform pg_advisory_xact_lock(20260729, 1);

  select greatest(v_now, next_request_at)
  into v_slot
  from public.nominatim_rate_limit
  where singleton = true
  for update;

  update public.nominatim_rate_limit
  set next_request_at = v_slot + interval '1 second'
  where singleton = true;

  return greatest(0, ceil(extract(epoch from (v_slot - v_now)) * 1000)::integer);
end;
$function$;

REVOKE ALL ON FUNCTION public.reserve_nominatim_slot() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_nominatim_slot() TO service_role;

-- Existing unlocated test case: Paradigm Mall, Johor Bahru.
UPDATE public.tickets
SET latitude = 1.5146529,
    longitude = 103.6854368,
    address_text = coalesce(
      address_text,
      'Paradigm Mall, Skudai Highway, Tampoi, Skudai, Johor Bahru, Johor 81200'
    ),
    location_source = 'staff'
WHERE id = 27;

-- tickets.geom is already a STORED generated column from lat/lng; no manual sync.

ALTER TABLE public.tickets DROP COLUMN photo_public;

-- Public map surface: retain unlocated parent cases so clients can count them.
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
  p.parent_ticket_id,
  p.needs_location
FROM public.tickets p
WHERE p.is_public = true
  AND p.public_display_opt_out = false
  AND p.parent_ticket_id IS NULL;

COMMENT ON VIEW public.public_tickets IS
  'WARNING: Must keep security_invoker = false. Anon SELECT runs as owner while tickets RLS denies direct anon access. Parent tickets only; coordinates rounded to 4 decimals. Includes needs_location so unlocated cases are counted, never silently hidden. No ticket number, address, description, photos, or PII.';

REVOKE ALL ON TABLE public.public_tickets FROM PUBLIC;
REVOKE ALL ON TABLE public.public_tickets FROM anon;
GRANT SELECT ON TABLE public.public_tickets TO anon, authenticated;

-- Active viewers get a deliberately non-PII ticket surface.
CREATE VIEW public.staff_tickets_safe
WITH (security_invoker = false)
AS
SELECT
  t.id,
  t.ticket_number,
  t.language,
  t.category,
  t.latitude,
  t.longitude,
  t.address_text,
  t.location_source,
  t.needs_location,
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
  t.assigned_to,
  CASE
    WHEN t.agency_reported_at IS NULL THEN NULL
    ELSE (CURRENT_DATE - t.agency_reported_at)
  END AS days_outstanding
FROM public.tickets t
WHERE public.current_staff_is_active();

COMMENT ON VIEW public.staff_tickets_safe IS
  'WARNING: Must keep security_invoker = false. Active viewers read this non-PII surface while direct tickets RLS denies them. Excludes name, phone, description, messages, media paths, and consent fields.';

REVOKE ALL ON TABLE public.staff_tickets_safe FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.staff_tickets_safe TO authenticated;

-- Assignee names without exposing auth.users or staff email addresses.
CREATE OR REPLACE VIEW public.active_staff_directory
WITH (security_invoker = false)
AS
SELECT s.user_id, s.name, s.role
FROM public.staff s
WHERE s.active = true
  AND s.role IN ('staff', 'admin')
  AND public.current_staff_is_active();

COMMENT ON VIEW public.active_staff_directory IS
  'Active staff/admin assignee directory. Must keep security_invoker = false; gated by current_staff_is_active().';

REVOKE ALL ON TABLE public.active_staff_directory FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.active_staff_directory TO authenticated;

-- Notes with stable author display names. Existing case_notes RLS remains
-- staff/admin SELECT + INSERT only and append-only.
CREATE OR REPLACE VIEW public.case_notes_with_author
WITH (security_invoker = false)
AS
SELECT n.id, n.ticket_id, n.author_id, s.name AS author_name, n.body, n.created_at
FROM public.case_notes n
JOIN public.staff s ON s.user_id = n.author_id
WHERE public.is_active_staff_or_admin();

COMMENT ON VIEW public.case_notes_with_author IS
  'Read-only case-note thread with author names. Must keep security_invoker = false; staff/admin only.';

REVOKE ALL ON TABLE public.case_notes_with_author FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.case_notes_with_author TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.case_notes_id_seq TO authenticated;

-- Staff/admin can create and remove public copies. Private originals remain
-- readable only through signed URLs under the existing private-bucket policy.
DROP POLICY IF EXISTS "ticket_photos_public_bucket_staff_insert" ON storage.objects;
DROP POLICY IF EXISTS "ticket_photos_public_bucket_staff_update" ON storage.objects;
DROP POLICY IF EXISTS "ticket_photos_public_bucket_staff_delete" ON storage.objects;

CREATE POLICY "ticket_photos_public_bucket_staff_insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'ticket-photos-public'
    AND public.is_active_staff_or_admin()
  );

CREATE POLICY "ticket_photos_public_bucket_staff_update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'ticket-photos-public'
    AND public.is_active_staff_or_admin()
  )
  WITH CHECK (
    bucket_id = 'ticket-photos-public'
    AND public.is_active_staff_or_admin()
  );

CREATE POLICY "ticket_photos_public_bucket_staff_delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'ticket-photos-public'
    AND public.is_active_staff_or_admin()
  );

-- Service-role-only intake. Coordinates and source are mandatory.
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
  p_location_source text DEFAULT NULL::text,
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
SET search_path = public, extensions
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
  if p_latitude is null or p_longitude is null then
    raise exception 'Ticket coordinates are required' using errcode = '23514';
  end if;

  if p_location_source is null or p_location_source not in ('pin', 'geocoded', 'staff') then
    raise exception 'Valid location_source is required' using errcode = '23514';
  end if;

  if p_whatsapp_message_id is not null then
    select * into v_result
    from public.tickets
    where whatsapp_message_id = p_whatsapp_message_id;
    if found then
      return v_result;
    end if;
  end if;

  v_new_point := st_setsrid(st_makepoint(p_longitude, p_latitude), 4326);

  select * into v_existing
  from public.tickets
  where category = p_category
    and status <> 'selesai'
    and geom is not null
    and st_dwithin(geom::geography, v_new_point::geography, 15)
  order by created_at asc
  limit 1;

  if found then
    v_parent_id := coalesce(v_existing.parent_ticket_id, v_existing.id);
    select ticket_number into v_ticket_number
    from public.tickets where id = v_parent_id;

    v_ticket_number := v_ticket_number || '-' ||
      (select (count(*) + 2)::text
       from public.tickets where parent_ticket_id = v_parent_id);

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

  insert into public.tickets (
    ticket_number, whatsapp_number, name, language, category, description,
    photo_url, voice_note_url, latitude, longitude, address_text, location_source,
    parent_ticket_id, whatsapp_message_id, contactable, upvote_count,
    agency, agency_ref, agency_reported_at, publish_agency_ref,
    public_display_opt_out, is_public, consent_given_at, consent_version
  ) values (
    v_ticket_number, p_whatsapp_number, p_name, p_language, p_category, p_description,
    p_photo_url, p_voice_note_url, p_latitude, p_longitude, p_address_text, p_location_source,
    v_parent_id, p_whatsapp_message_id, p_contactable, 1,
    p_agency, p_agency_ref, p_agency_reported_at, coalesce(p_publish_agency_ref, true),
    coalesce(p_public_display_opt_out, false), v_is_public,
    p_consent_given_at, coalesce(p_consent_version, '2026-07-29')
  )
  returning * into v_result;

  return v_result;
end;
$function$;

REVOKE ALL ON FUNCTION public.create_or_link_ticket(
  text, issue_category, text, double precision, double precision,
  text, input_language, text, text, text, text, text, boolean,
  text, text, date, boolean, boolean, timestamptz, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_or_link_ticket(
  text, issue_category, text, double precision, double precision,
  text, input_language, text, text, text, text, text, boolean,
  text, text, date, boolean, boolean, timestamptz, text
) TO service_role;
