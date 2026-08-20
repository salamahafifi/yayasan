-- Append-only audit trail for staff/admin ticket edits.
CREATE TABLE IF NOT EXISTS public.ticket_edit_log (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  ticket_id bigint NOT NULL REFERENCES public.tickets(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES public.staff(user_id) ON DELETE SET NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ticket_edit_log_ticket_id_created_idx
  ON public.ticket_edit_log (ticket_id, created_at DESC);

COMMENT ON TABLE public.ticket_edit_log IS
  'Append-only field change log for tickets. Written by trigger; staff/admin read via view.';

ALTER TABLE public.ticket_edit_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.ticket_edit_log FROM anon;
REVOKE ALL ON TABLE public.ticket_edit_log FROM authenticated;

CREATE POLICY "staff_admin_select_ticket_edit_log"
  ON public.ticket_edit_log
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff_or_admin());

GRANT SELECT ON TABLE public.ticket_edit_log TO authenticated;

CREATE OR REPLACE FUNCTION public.log_ticket_edits()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'status', OLD.status::text, NEW.status::text);
  END IF;
  IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'assigned_to', OLD.assigned_to::text, NEW.assigned_to::text);
  END IF;
  IF OLD.name IS DISTINCT FROM NEW.name THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'name', OLD.name, NEW.name);
  END IF;
  IF OLD.contact_number IS DISTINCT FROM NEW.contact_number THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'contact_number', OLD.contact_number, NEW.contact_number);
  END IF;
  IF OLD.description IS DISTINCT FROM NEW.description THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'description', OLD.description, NEW.description);
  END IF;
  IF OLD.category IS DISTINCT FROM NEW.category THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'category', OLD.category::text, NEW.category::text);
  END IF;
  IF OLD.adun_priority IS DISTINCT FROM NEW.adun_priority THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'adun_priority', OLD.adun_priority::text, NEW.adun_priority::text);
  END IF;
  IF OLD.agency IS DISTINCT FROM NEW.agency THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'agency', OLD.agency, NEW.agency);
  END IF;
  IF OLD.agency_ref IS DISTINCT FROM NEW.agency_ref THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'agency_ref', OLD.agency_ref, NEW.agency_ref);
  END IF;
  IF OLD.agency_reported_at IS DISTINCT FROM NEW.agency_reported_at THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'agency_reported_at', OLD.agency_reported_at::text, NEW.agency_reported_at::text);
  END IF;
  IF OLD.address_text IS DISTINCT FROM NEW.address_text THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'address_text', OLD.address_text, NEW.address_text);
  END IF;
  IF OLD.is_public IS DISTINCT FROM NEW.is_public THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'is_public', OLD.is_public::text, NEW.is_public::text);
  END IF;
  IF OLD.latitude IS DISTINCT FROM NEW.latitude
     OR OLD.longitude IS DISTINCT FROM NEW.longitude THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (
      NEW.id,
      actor,
      'location',
      CASE
        WHEN OLD.latitude IS NULL OR OLD.longitude IS NULL THEN NULL
        ELSE OLD.latitude::text || ', ' || OLD.longitude::text
      END,
      CASE
        WHEN NEW.latitude IS NULL OR NEW.longitude IS NULL THEN NULL
        ELSE NEW.latitude::text || ', ' || NEW.longitude::text
      END
    );
  END IF;
  IF OLD.location_source IS DISTINCT FROM NEW.location_source THEN
    INSERT INTO public.ticket_edit_log (ticket_id, actor_id, field_name, old_value, new_value)
    VALUES (NEW.id, actor, 'location_source', OLD.location_source::text, NEW.location_source::text);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_log_edits ON public.tickets;
CREATE TRIGGER tickets_log_edits
  AFTER UPDATE ON public.tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.log_ticket_edits();

CREATE OR REPLACE VIEW public.ticket_edit_log_with_actor
WITH (security_invoker = false)
AS
SELECT
  l.id,
  l.ticket_id,
  l.actor_id,
  coalesce(s.name, 'System') AS actor_name,
  l.field_name,
  l.old_value,
  l.new_value,
  l.created_at
FROM public.ticket_edit_log l
LEFT JOIN public.staff s ON s.user_id = l.actor_id
WHERE public.is_active_staff_or_admin();

COMMENT ON VIEW public.ticket_edit_log_with_actor IS
  'Read-only ticket edit history with actor names. Staff/admin only.';

REVOKE ALL ON TABLE public.ticket_edit_log_with_actor FROM PUBLIC, anon;
GRANT SELECT ON TABLE public.ticket_edit_log_with_actor TO authenticated;
