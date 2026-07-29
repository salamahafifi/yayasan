-- Phase 1: private photo storage, ticket_photos, whatsapp_messages, case_notes, assigned_to.

-- =============================================================================
-- 0. Orphan photo cleanup is NOT in this migration.
--    After apply: set private (below), then run scripts/cleanup-orphan-ticket-photos.mjs
--    via Storage API remove(). Expected: 9 → 2 objects in ticket-photos.
-- =============================================================================

-- =============================================================================
-- 1. Storage buckets (private ticket-photos first)
-- =============================================================================
UPDATE storage.buckets
SET public = false
WHERE id = 'ticket-photos';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'ticket-photos-public',
  'ticket-photos-public',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

UPDATE storage.buckets
SET public = false
WHERE id = 'ticket-voice-notes';

DROP POLICY IF EXISTS "ticket_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "ticket_photos_staff_read" ON storage.objects;
DROP POLICY IF EXISTS "ticket_photos_service_insert" ON storage.objects;
DROP POLICY IF EXISTS "ticket_photos_public_bucket_anon_read" ON storage.objects;
DROP POLICY IF EXISTS "ticket_voice_notes_staff_read" ON storage.objects;

CREATE POLICY "ticket_photos_staff_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ticket-photos'
    AND public.is_active_staff_or_admin()
  );

CREATE POLICY "ticket_photos_public_bucket_anon_read"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'ticket-photos-public');

CREATE POLICY "ticket_voice_notes_staff_read"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ticket-voice-notes'
    AND public.is_active_staff_or_admin()
  );

-- =============================================================================
-- 2. tickets.assigned_to (photo_url / photo_public kept unused during transition)
-- =============================================================================
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.staff(user_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS tickets_assigned_to_idx ON public.tickets (assigned_to);

COMMENT ON COLUMN public.tickets.photo_url IS
  'DEPRECATED during transition. Prefer ticket_photos.storage_path. Kept for rollback.';
COMMENT ON COLUMN public.tickets.photo_public IS
  'DEPRECATED during transition. Prefer ticket_photos.is_public. Kept unused.';

-- =============================================================================
-- 3. ticket_photos
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.ticket_photos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  public_path text,
  is_public boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ticket_photos_public_path_when_public CHECK (
    (is_public = false AND public_path IS NULL)
    OR (is_public = true AND public_path IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS ticket_photos_ticket_id_idx ON public.ticket_photos (ticket_id);
CREATE UNIQUE INDEX IF NOT EXISTS ticket_photos_ticket_storage_path_uidx
  ON public.ticket_photos (ticket_id, storage_path);

COMMENT ON TABLE public.ticket_photos IS
  'One row per image. storage_path = private ticket-photos object. public_path = copy in ticket-photos-public when approved.';
COMMENT ON COLUMN public.ticket_photos.storage_path IS
  'Path inside private bucket ticket-photos (not a URL).';
COMMENT ON COLUMN public.ticket_photos.public_path IS
  'Path inside public bucket ticket-photos-public after staff approve. Null when unpublished.';

ALTER TABLE public.ticket_photos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ticket_photos FROM anon;
REVOKE ALL ON TABLE public.ticket_photos FROM authenticated;

-- Staff/admin: full row access (including unpublished).
CREATE POLICY "staff_admin_select_ticket_photos"
  ON public.ticket_photos
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff_or_admin());

CREATE POLICY "staff_admin_insert_ticket_photos"
  ON public.ticket_photos
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_active_staff_or_admin());

CREATE POLICY "staff_admin_update_ticket_photos"
  ON public.ticket_photos
  FOR UPDATE
  TO authenticated
  USING (public.is_active_staff_or_admin())
  WITH CHECK (public.is_active_staff_or_admin());

CREATE POLICY "staff_admin_delete_ticket_photos"
  ON public.ticket_photos
  FOR DELETE
  TO authenticated
  USING (public.is_active_staff_or_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ticket_photos TO authenticated;

-- =============================================================================
-- 5. Migrate existing tickets.photo_url → one ticket_photos row (private path only)
-- =============================================================================
INSERT INTO public.ticket_photos (ticket_id, storage_path, public_path, is_public, sort_order, created_at)
SELECT
  t.id,
  NULLIF(split_part(split_part(t.photo_url, '/ticket-photos/', 2), '?', 1), ''),
  NULL,
  false,
  0,
  coalesce(t.created_at, now())
FROM public.tickets t
WHERE t.photo_url IS NOT NULL
  AND NULLIF(split_part(split_part(t.photo_url, '/ticket-photos/', 2), '?', 1), '') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM public.ticket_photos p
    WHERE p.ticket_id = t.id
      AND p.storage_path = NULLIF(split_part(split_part(t.photo_url, '/ticket-photos/', 2), '?', 1), '')
  );

-- Do NOT auto-copy to ticket-photos-public here. Existing photo_public flags were
-- ticket-level; none are relied on for public listing until staff re-approve.

-- =============================================================================
-- 6. whatsapp_messages
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.whatsapp_messages (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id bigint REFERENCES public.tickets(id) ON DELETE SET NULL,
  whatsapp_number text NOT NULL,
  direction text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  wa_message_id text,
  body text,
  media_path text,
  media_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS whatsapp_messages_wa_message_id_uidx
  ON public.whatsapp_messages (wa_message_id)
  WHERE wa_message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS whatsapp_messages_ticket_id_created_idx
  ON public.whatsapp_messages (ticket_id, created_at);

CREATE INDEX IF NOT EXISTS whatsapp_messages_number_created_idx
  ON public.whatsapp_messages (whatsapp_number, created_at);

ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.whatsapp_messages FROM anon;
REVOKE ALL ON TABLE public.whatsapp_messages FROM authenticated;

-- Staff/admin only. Never viewer, never anon.
CREATE POLICY "staff_admin_select_whatsapp_messages"
  ON public.whatsapp_messages
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff_or_admin());

-- Writes via service role (webhook). Authenticated staff do not insert from client.
GRANT SELECT ON TABLE public.whatsapp_messages TO authenticated;

-- =============================================================================
-- 7. case_notes
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.case_notes (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES public.staff(user_id) ON DELETE RESTRICT,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS case_notes_ticket_id_created_idx
  ON public.case_notes (ticket_id, created_at);

ALTER TABLE public.case_notes ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.case_notes FROM anon;
REVOKE ALL ON TABLE public.case_notes FROM authenticated;

CREATE POLICY "staff_admin_select_case_notes"
  ON public.case_notes
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff_or_admin());

CREATE POLICY "staff_admin_insert_case_notes"
  ON public.case_notes
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_active_staff_or_admin()
    AND author_id = auth.uid()
  );

GRANT SELECT, INSERT ON TABLE public.case_notes TO authenticated;

-- =============================================================================
-- 8. Rebuild public_ticket_photos from approved public copies only
-- =============================================================================
DROP VIEW IF EXISTS public.public_ticket_photos;
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
  AND coalesce(t.parent_ticket_id, t.id) IN (
    SELECT p.id FROM public.tickets p
    WHERE p.parent_ticket_id IS NULL
      AND p.is_public = true
      AND p.public_display_opt_out = false
  );

COMMENT ON VIEW public.public_ticket_photos IS
  'WARNING: Must keep security_invoker = false. Lists approved photos only (public_path in ticket-photos-public). Anon never reads ticket_photos base table.';

REVOKE ALL ON TABLE public.public_ticket_photos FROM PUBLIC;
REVOKE ALL ON TABLE public.public_ticket_photos FROM anon;
GRANT SELECT ON TABLE public.public_ticket_photos TO anon;
GRANT SELECT ON TABLE public.public_ticket_photos TO authenticated;
