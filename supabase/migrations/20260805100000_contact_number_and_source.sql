-- Multi-channel intake: rename WhatsApp-specific ticket columns, add source,
-- and recreate create_or_link_ticket with the same logic as
-- 20260729120000_phase3_case_management_location.sql.
--
-- Parameter choice: p_contact_number moves to the END with DEFAULT NULL.
-- Reason: PostgreSQL forbids DEFAULT on an early parameter while later
-- required parameters (category, description, lat, lng) have no defaults.
-- Named-arg callers (webhook / future web Edge Function) can omit it;
-- WhatsApp continues to pass p_contact_number by name.
--
-- Phone number usage in the previous body (unchanged behaviour):
--   - NOT used for 15m deduplication (that uses category + geom + status).
--   - NOT used for session lookup (sessions live in conversation_sessions).
--   - Only written into the ticket row; when NULL, the insert stores NULL.
--   - Idempotency uses source_message_id (formerly whatsapp_message_id) only.

DROP FUNCTION IF EXISTS public.create_or_link_ticket(
  text, issue_category, text, double precision, double precision,
  text, input_language, text, text, text, text, text, boolean,
  text, text, date, boolean, boolean, timestamptz, text
);

ALTER TABLE public.tickets
  RENAME COLUMN whatsapp_number TO contact_number;

ALTER TABLE public.tickets
  ALTER COLUMN contact_number DROP NOT NULL;

ALTER TABLE public.tickets
  RENAME COLUMN whatsapp_message_id TO source_message_id;

ALTER TABLE public.tickets
  ADD COLUMN source text NOT NULL DEFAULT 'whatsapp';

ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_source_check
    CHECK (source IN ('whatsapp', 'web', 'volunteer'));

COMMENT ON COLUMN public.tickets.contact_number IS
  'Resident contact phone. Nullable for web/volunteer intake where phone may be omitted.';
COMMENT ON COLUMN public.tickets.source_message_id IS
  'Idempotency key from the intake channel (e.g. WhatsApp message id).';
COMMENT ON COLUMN public.tickets.source IS
  'Intake channel: whatsapp, web, or volunteer.';

-- Same body as Phase 3, with renamed columns/parameters and source written through.
CREATE OR REPLACE FUNCTION public.create_or_link_ticket(
  p_category issue_category,
  p_description text,
  p_latitude double precision,
  p_longitude double precision,
  p_name text DEFAULT NULL::text,
  p_language input_language DEFAULT 'ms'::input_language,
  p_photo_url text DEFAULT NULL::text,
  p_voice_note_url text DEFAULT NULL::text,
  p_source_message_id text DEFAULT NULL::text,
  p_address_text text DEFAULT NULL::text,
  p_location_source text DEFAULT NULL::text,
  p_contactable boolean DEFAULT true,
  p_agency text DEFAULT NULL::text,
  p_agency_ref text DEFAULT NULL::text,
  p_agency_reported_at date DEFAULT NULL::date,
  p_publish_agency_ref boolean DEFAULT true,
  p_public_display_opt_out boolean DEFAULT false,
  p_consent_given_at timestamptz DEFAULT NULL::timestamptz,
  p_consent_version text DEFAULT '2026-07-29'::text,
  p_source text DEFAULT 'whatsapp'::text,
  p_contact_number text DEFAULT NULL::text
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

  if p_source_message_id is not null then
    select * into v_result
    from public.tickets
    where source_message_id = p_source_message_id;
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
    ticket_number, contact_number, name, language, category, description,
    photo_url, voice_note_url, latitude, longitude, address_text, location_source,
    parent_ticket_id, source_message_id, contactable, upvote_count,
    agency, agency_ref, agency_reported_at, publish_agency_ref,
    public_display_opt_out, is_public, consent_given_at, consent_version,
    source
  ) values (
    v_ticket_number, p_contact_number, p_name, p_language, p_category, p_description,
    p_photo_url, p_voice_note_url, p_latitude, p_longitude, p_address_text, p_location_source,
    v_parent_id, p_source_message_id, p_contactable, 1,
    p_agency, p_agency_ref, p_agency_reported_at, coalesce(p_publish_agency_ref, true),
    coalesce(p_public_display_opt_out, false), v_is_public,
    p_consent_given_at, coalesce(p_consent_version, '2026-07-29'),
    coalesce(p_source, 'whatsapp')
  )
  returning * into v_result;

  return v_result;
end;
$function$;

REVOKE ALL ON FUNCTION public.create_or_link_ticket(
  issue_category, text, double precision, double precision,
  text, input_language, text, text, text, text, text, boolean,
  text, text, date, boolean, boolean, timestamptz, text, text, text
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.create_or_link_ticket(
  issue_category, text, double precision, double precision,
  text, input_language, text, text, text, text, text, boolean,
  text, text, date, boolean, boolean, timestamptz, text, text, text
) TO service_role;
