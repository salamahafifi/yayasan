-- Keep archived cases off the public map even if is_public is later flipped by mistake.
-- Must run after 20260820120000 so 'arkib' exists outside the ADD VALUE transaction.

DROP VIEW IF EXISTS public.public_ticket_photos;
DROP VIEW IF EXISTS public.public_tickets;

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
  AND p.parent_ticket_id IS NULL
  AND p.status <> 'arkib';

COMMENT ON VIEW public.public_tickets IS
  'WARNING: Must keep security_invoker = false. Parent tickets only; excludes arkib. Coordinates rounded to 4 decimals. No ticket number, address, description, photos, or PII.';

REVOKE ALL ON TABLE public.public_tickets FROM PUBLIC;
REVOKE ALL ON TABLE public.public_tickets FROM anon;
GRANT SELECT ON TABLE public.public_tickets TO anon, authenticated;

CREATE VIEW public.public_ticket_photos
WITH (security_invoker = false)
AS
SELECT
  tp.id AS photo_id,
  tp.ticket_id,
  coalesce(t.parent_ticket_id, t.id) AS root_ticket_id,
  tp.public_path,
  tp.sort_order,
  tp.created_at
FROM public.ticket_photos tp
JOIN public.tickets t ON t.id = tp.ticket_id
WHERE tp.is_public = true
  AND tp.public_path IS NOT NULL
  AND t.is_public = true
  AND t.public_display_opt_out = false
  AND t.status <> 'arkib'
  AND coalesce(t.parent_ticket_id, t.id) IN (
    SELECT p.id FROM public.tickets p
    WHERE p.parent_ticket_id IS NULL
      AND p.is_public = true
      AND p.public_display_opt_out = false
      AND p.status <> 'arkib'
  );

COMMENT ON VIEW public.public_ticket_photos IS
  'WARNING: Must keep security_invoker = false. Approved photos only; excludes arkib cases.';

REVOKE ALL ON TABLE public.public_ticket_photos FROM PUBLIC;
REVOKE ALL ON TABLE public.public_ticket_photos FROM anon;
GRANT SELECT ON TABLE public.public_ticket_photos TO anon;
GRANT SELECT ON TABLE public.public_ticket_photos TO authenticated;
