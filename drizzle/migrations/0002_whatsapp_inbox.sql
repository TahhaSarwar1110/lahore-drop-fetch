CREATE TABLE public.whatsapp_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL UNIQUE,
  display_name text,
  customer_user_id uuid,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  last_message_preview text,
  last_inbound_at timestamptz,
  unread_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.whatsapp_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  wa_message_id text UNIQUE,
  direction text NOT NULL CHECK (direction IN ('inbound','outbound')),
  msg_type text NOT NULL DEFAULT 'text',
  body text,
  media_id text,
  media_mime text,
  media_filename text,
  status text NOT NULL DEFAULT 'received',
  status_updated_at timestamptz,
  error text,
  sent_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_wa_messages_conv ON public.whatsapp_messages(conversation_id, created_at);
CREATE INDEX idx_wa_conversations_last ON public.whatsapp_conversations(last_message_at DESC);

GRANT SELECT ON public.whatsapp_conversations TO authenticated;
GRANT SELECT ON public.whatsapp_messages TO authenticated;
GRANT ALL ON public.whatsapp_conversations TO service_role;
GRANT ALL ON public.whatsapp_messages TO service_role;

ALTER TABLE public.whatsapp_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.whatsapp_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Managers and admins read conversations" ON public.whatsapp_conversations
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Managers and admins read messages" ON public.whatsapp_messages
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'manager'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role));

ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.whatsapp_messages;