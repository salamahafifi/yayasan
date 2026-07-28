-- A/B/C: Harden public surface, round published coordinates, drop identifying fields from public_tickets.
-- Does NOT rewrite tickets.latitude / tickets.longitude / tickets.address_text (admin keeps full data).

-- 1. Rebuild public view: no adun_priority, no address_text; lat/lng rounded to 4 dp.
CREATE OR REPLACE VIEW public.public_tickets AS
SELECT
  p.id,
  p.ticket_number,
  p.category,
  p.description,
  p.status,
  round(p.latitude::numeric, 4)::double precision AS latitude,
  round(p.longitude::numeric, 4)::double precision AS longitude,
  p.parent_ticket_id,
  p.upvote_count,
  p.created_at,
  p.updated_at,
  p.photo_url
FROM public.tickets p
WHERE p.is_public = true;

-- 2. Anon: SELECT only on the public view.
REVOKE ALL ON TABLE public.public_tickets FROM anon;
GRANT SELECT ON TABLE public.public_tickets TO anon;
GRANT SELECT ON TABLE public.public_tickets TO authenticated;

-- 3. Revoke write privileges from anon on base tables (RLS already blocks rows; this is defence in depth).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.tickets FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.conversation_sessions FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.ticket_sequences FROM anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON TABLE public.staff FROM anon;

-- Keep SELECT grants on base tables if present; RLS + deny policy still return zero rows for anon.
-- Explicit deny-all on tickets for anon (RESTRICTIVE so it cannot be OR'd away).
DROP POLICY IF EXISTS "anon_deny_all_tickets" ON public.tickets;
CREATE POLICY "anon_deny_all_tickets"
  ON public.tickets
  AS RESTRICTIVE
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);
