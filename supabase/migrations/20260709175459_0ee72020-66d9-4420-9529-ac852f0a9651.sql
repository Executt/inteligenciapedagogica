
CREATE TABLE public.pulse_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'pedagogica-pulse',
  event_type text NOT NULL,
  external_id text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip text,
  user_agent text,
  processed boolean NOT NULL DEFAULT false,
  received_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pulse_events_received_at_idx ON public.pulse_events (received_at DESC);
CREATE INDEX pulse_events_event_type_idx ON public.pulse_events (event_type);

GRANT SELECT ON public.pulse_events TO authenticated;
GRANT ALL ON public.pulse_events TO service_role;

ALTER TABLE public.pulse_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins podem ler eventos do Pulse"
ON public.pulse_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
