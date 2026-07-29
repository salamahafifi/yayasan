-- Bootstrap first admin after you have signed in once (Google or magic link),
-- so auth.users + the staff trigger have created your row.
-- Replace YOUR_EMAIL@example.com with your address.

-- Preferred: match via auth.users (works even if staff.email was null / wrong)
UPDATE public.staff s
SET
  active = true,
  role = 'admin',
  email = COALESCE(s.email, u.email)
FROM auth.users u
WHERE s.user_id = u.id
  AND u.email = 'YOUR_EMAIL@example.com';

-- Fallback if staff.email was populated correctly by the trigger:
-- UPDATE public.staff
-- SET active = true, role = 'admin'
-- WHERE email = 'YOUR_EMAIL@example.com';

-- Verify:
-- SELECT s.user_id, s.name, s.email, s.role, s.active, u.email AS auth_email
-- FROM public.staff s
-- JOIN auth.users u ON u.id = s.user_id;
