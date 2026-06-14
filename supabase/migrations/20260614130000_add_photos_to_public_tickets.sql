CREATE OR REPLACE VIEW public.public_tickets AS
SELECT
  p.id,
  p.ticket_number,
  p.category,
  p.description,
  p.status,
  p.adun_priority,
  p.latitude,
  p.longitude,
  p.address_text,
  p.parent_ticket_id,
  p.upvote_count,
  p.created_at,
  p.updated_at,
  COALESCE(
    (
      SELECT array_agg(c.photo_url ORDER BY c.created_at)
      FROM tickets c
      WHERE c.photo_url IS NOT NULL
        AND c.is_public = true
        AND (
          c.id = COALESCE(p.parent_ticket_id, p.id)
          OR c.parent_ticket_id = COALESCE(p.parent_ticket_id, p.id)
        )
    ),
    ARRAY[]::text[]
  ) AS photo_urls
FROM tickets p
WHERE p.is_public = true;

GRANT SELECT ON public.public_tickets TO anon, authenticated;
