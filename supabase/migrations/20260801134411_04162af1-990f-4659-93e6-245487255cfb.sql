CREATE TABLE public.pulse_ingest_nonces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nonce text NOT NULL UNIQUE,
  request_ts timestamptz NOT NULL,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '10 minutes'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pulse_ingest_nonces TO authenticated;
GRANT ALL ON public.pulse_ingest_nonces TO service_role;

ALTER TABLE public.pulse_ingest_nonces ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nonces admin read" ON public.pulse_ingest_nonces
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX pulse_ingest_nonces_expires_idx ON public.pulse_ingest_nonces (expires_at);

CREATE OR REPLACE FUNCTION public.purge_pulse_nonces()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.pulse_ingest_nonces WHERE expires_at < now();
$$;