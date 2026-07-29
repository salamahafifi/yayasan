-- Google SSO staff gating: roles, auto-provision, RLS, safe ticket view.

-- ---------------------------------------------------------------------------
-- 1. Schema: role tiers + pending-by-default
-- ---------------------------------------------------------------------------
ALTER TABLE public.staff DROP CONSTRAINT IF EXISTS staff_role_check;
ALTER TABLE public.staff
  ADD CONSTRAINT staff_role_check
  CHECK (role = ANY (ARRAY['viewer'::text, 'staff'::text, 'admin'::text]));

ALTER TABLE public.staff ALTER COLUMN role SET DEFAULT 'viewer';
ALTER TABLE public.staff ALTER COLUMN active SET DEFAULT false;

-- Email for approvals UI (auth.users is not readable from the client)
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS email text;

-- ---------------------------------------------------------------------------
-- 2. Helpers (SECURITY DEFINER) — avoid recursive RLS when policies read staff
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_staff_is_active()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid() AND active = true
  );
$$;

CREATE OR REPLACE FUNCTION public.current_staff_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.staff
  WHERE user_id = auth.uid() AND active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid() AND active = true AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_staff_or_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff
    WHERE user_id = auth.uid()
      AND active = true
      AND role IN ('staff', 'admin')
  );
$$;

REVOKE ALL ON FUNCTION public.current_staff_is_active() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_staff_role() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_staff_or_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_staff_is_active() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_staff_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_staff_or_admin() TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Auto-create pending staff row on auth.users insert
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.staff (user_id, name, email, role, active)
  VALUES (
    NEW.id,
    COALESCE(
      NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
      NULLIF(NEW.raw_user_meta_data->>'name', ''),
      NULLIF(NEW.email, ''),
      'Unknown'
    ),
    NEW.email,
    'viewer',
    false
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 4. Tickets RLS: only active staff/admin may read/update base table (PII)
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Active staff can view all tickets" ON public.tickets;
DROP POLICY IF EXISTS "Active staff can update tickets" ON public.tickets;

CREATE POLICY "Active staff and admin can view tickets"
  ON public.tickets
  FOR SELECT
  TO authenticated
  USING (public.is_active_staff_or_admin());

CREATE POLICY "Active staff and admin can update tickets"
  ON public.tickets
  FOR UPDATE
  TO authenticated
  USING (public.is_active_staff_or_admin())
  WITH CHECK (public.is_active_staff_or_admin());

-- ---------------------------------------------------------------------------
-- 5. Safe view for any active staff member (including viewers)
--    Runs as owner so it can read tickets; still gated by auth.uid() + active.
--    Excludes name, whatsapp_number, and other direct identifiers.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.staff_tickets_safe
WITH (security_invoker = false)
AS
SELECT
  t.id,
  t.ticket_number,
  t.language,
  t.category,
  t.description,
  t.photo_url,
  t.latitude,
  t.longitude,
  t.address_text,
  t.status,
  t.adun_priority,
  t.is_public,
  t.parent_ticket_id,
  t.upvote_count,
  t.created_at,
  t.updated_at
FROM public.tickets t
WHERE public.current_staff_is_active();

COMMENT ON VIEW public.staff_tickets_safe IS
  'WARNING: Must keep security_invoker = false. This view intentionally runs as owner so active staff (including viewers) can read non-PII ticket fields while RLS on public.tickets denies viewers direct SELECT of name/whatsapp_number. Setting security_invoker = true will break viewer access or re-expose base-table RLS incorrectly. Do not "fix" this for the Supabase linter without understanding the role-tier design.';

REVOKE ALL ON TABLE public.staff_tickets_safe FROM PUBLIC;
REVOKE ALL ON TABLE public.staff_tickets_safe FROM anon;
GRANT SELECT ON TABLE public.staff_tickets_safe TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Staff table RLS: own row always; admins manage all
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Staff can view own record" ON public.staff;

CREATE POLICY "Users can view own staff row"
  ON public.staff
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all staff"
  ON public.staff
  FOR SELECT
  TO authenticated
  USING (public.is_active_admin());

CREATE POLICY "Admins can update staff"
  ON public.staff
  FOR UPDATE
  TO authenticated
  USING (public.is_active_admin())
  WITH CHECK (public.is_active_admin());
