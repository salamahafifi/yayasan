-- Rate-limit log for public web complaint submissions.
-- RLS on, zero policies: only service_role can read/write.

CREATE TABLE public.web_submission_log (
  id bigserial PRIMARY KEY,
  ip_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX web_submission_log_ip_hash_created_at_idx
  ON public.web_submission_log (ip_hash, created_at);

COMMENT ON TABLE public.web_submission_log IS
  'Hashed client IPs for web intake rate limiting. Stores SHA-256 digests only, never raw addresses.';

ALTER TABLE public.web_submission_log ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.web_submission_log FROM PUBLIC;
REVOKE ALL ON TABLE public.web_submission_log FROM anon;
REVOKE ALL ON TABLE public.web_submission_log FROM authenticated;

GRANT SELECT, INSERT ON TABLE public.web_submission_log TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.web_submission_log_id_seq TO service_role;
