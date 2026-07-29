-- Rebuild issue_category enum. Test tickets deleted (user approved).
--
-- Approach (avoids ALTER TYPE ... ADD VALUE inside a transaction):
-- 1. DELETE all tickets (and cascades: ticket_photos, case_notes; whatsapp_messages ticket_id SET NULL)
-- 2. Reset the current ticket sequence to 0
-- 3. Clear conversation_sessions.category
-- 4. Drop create_or_link_ticket (depends on enum)
-- 5. Alter category columns to text
-- 6. DROP TYPE issue_category
-- 7. CREATE TYPE issue_category AS ENUM (new values)
-- 8. Alter columns back to issue_category
-- 9. Recreate create_or_link_ticket with SECURITY DEFINER and a fixed search_path

-- 1. Wipe test data that uses the old enum
DELETE FROM public.tickets;

INSERT INTO public.ticket_sequences (year_month, last_number)
VALUES (to_char(now() AT TIME ZONE 'Asia/Kuala_Lumpur', 'YYMM'), 0)
ON CONFLICT (year_month)
DO UPDATE SET last_number = 0;

UPDATE public.conversation_sessions
SET category = NULL
WHERE category IS NOT NULL;

-- Drop views/functions that depend on tickets.category or issue_category.
DROP VIEW IF EXISTS public.public_tickets;
DROP VIEW IF EXISTS public.staff_tickets_safe;
DROP FUNCTION IF EXISTS public.get_ticket_status(text);

DROP FUNCTION IF EXISTS public.create_or_link_ticket(
  text, issue_category, text, double precision, double precision,
  text, input_language, text, text, text, text, boolean,
  text, text, date, boolean, boolean, timestamptz, text
);

-- 3. Detach columns from old enum
ALTER TABLE public.tickets
  ALTER COLUMN category TYPE text USING category::text;

ALTER TABLE public.conversation_sessions
  ALTER COLUMN category TYPE text USING category::text;

-- 4. Replace enum
DROP TYPE public.issue_category;

CREATE TYPE public.issue_category AS ENUM (
  'longkang_tersumbat',
  'jalan_berlubang',
  'lampu_jalan',
  'sampah',
  'semak',
  'lain_lain'
);

-- 5. Reattach columns
ALTER TABLE public.tickets
  ALTER COLUMN category TYPE public.issue_category USING category::public.issue_category;

ALTER TABLE public.conversation_sessions
  ALTER COLUMN category TYPE public.issue_category USING NULLIF(category, '')::public.issue_category;

-- Recreate the public map surface.
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

-- Recreate the non-PII staff/viewer surface.
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

-- Recreate exact-number public status lookup against the new enum.
CREATE OR REPLACE FUNCTION public.get_ticket_status(p_ticket_number text)
RETURNS TABLE (
  category public.issue_category,
  status public.ticket_status,
  first_reported_at date,
  days_outstanding integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
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

-- Recreate create_or_link_ticket (same body as 20260729040000, with ADU prefix + consent fields).
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
