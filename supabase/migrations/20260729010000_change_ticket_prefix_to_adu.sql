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
  p_contactable boolean DEFAULT true
)
RETURNS tickets
LANGUAGE plpgsql
AS $function$
declare
  v_existing record;
  v_parent_id bigint;
  v_year_month text;
  v_seq int;
  v_ticket_number text;
  v_new_point geometry;
  v_result public.tickets;
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

    -- New tickets only. Existing N47- / ADUN- rows are left unchanged.
    v_ticket_number := 'ADU-' || v_year_month || '-' || lpad(v_seq::text, 4, '0');
  end if;

  insert into public.tickets (
    ticket_number, whatsapp_number, name, language, category, description,
    photo_url, voice_note_url, latitude, longitude, address_text,
    parent_ticket_id, whatsapp_message_id, contactable
  ) values (
    v_ticket_number, p_whatsapp_number, p_name, p_language, p_category, p_description,
    p_photo_url, p_voice_note_url, p_latitude, p_longitude, p_address_text,
    v_parent_id, p_whatsapp_message_id, p_contactable
  )
  returning * into v_result;

  return v_result;
end;
$function$;
