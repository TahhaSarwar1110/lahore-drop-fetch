CREATE TABLE public.whatsapp_events (
  event_id TEXT NOT NULL PRIMARY KEY,
  event_type TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_events TO service_role;
ALTER TABLE public.whatsapp_events ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.whatsapp_contacts (
  phone TEXT NOT NULL PRIMARY KEY,
  last_inbound_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT ALL ON public.whatsapp_contacts TO service_role;
ALTER TABLE public.whatsapp_contacts ENABLE ROW LEVEL SECURITY;