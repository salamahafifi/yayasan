-- Admins may hard-delete a case (cascades ticket_photos / case_notes).
-- Staff keep update-only access; viewers remain read-only via staff_tickets_safe.

DROP POLICY IF EXISTS "Admins can delete tickets" ON public.tickets;
CREATE POLICY "Admins can delete tickets"
  ON public.tickets
  FOR DELETE
  TO authenticated
  USING (public.is_active_admin());

GRANT DELETE ON TABLE public.tickets TO authenticated;
