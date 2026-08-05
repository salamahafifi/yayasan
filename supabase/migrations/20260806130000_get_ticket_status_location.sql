-- Semak lookup also returns rounded coordinates so the public map can fly to
-- the pin after a successful ticket-number search. Same 4dp rounding as
-- public_tickets (~street level). Null when the ticket still needs a location.

DROP FUNCTION IF EXISTS public.get_ticket_status(text);

CREATE OR REPLACE FUNCTION public.get_ticket_status(p_ticket_number text)
RETURNS TABLE (
  category public.issue_category,
  status public.ticket_status,
  first_reported_at date,
  days_outstanding integer,
  latitude double precision,
  longitude double precision,
  root_ticket_id bigint
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
    end as days_outstanding,
    round(coalesce(root.latitude, t.latitude)::numeric, 4)::double precision as latitude,
    round(coalesce(root.longitude, t.longitude)::numeric, 4)::double precision as longitude,
    coalesce(t.parent_ticket_id, t.id) as root_ticket_id
  from public.tickets t
  left join public.tickets root
    on root.id = coalesce(t.parent_ticket_id, t.id)
  where t.ticket_number = upper(trim(p_ticket_number))
  limit 1;
end;
$function$;

REVOKE ALL ON FUNCTION public.get_ticket_status(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_status(text) TO anon;
GRANT EXECUTE ON FUNCTION public.get_ticket_status(text) TO authenticated;

COMMENT ON FUNCTION public.get_ticket_status(text) IS
  'Public Semak lookup by exact ticket_number. Returns status fields plus rounded lat/lng and root_ticket_id for map focus.';
