import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Check, CheckCheck, Clock, FileText, Loader2, Mic, Search, Send, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useManagerCheck } from "@/hooks/useManagerCheck";

interface Conversation {
  id: string;
  phone: string;
  display_name: string | null;
  customer_user_id: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  last_inbound_at: string | null;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: string;
  msg_type: string;
  body: string | null;
  media_id: string | null;
  media_mime: string | null;
  media_filename: string | null;
  status: string;
  error: string | null;
  created_at: string;
}

const TEMPLATES = [
  { name: "tabedaar_order_received", params: ["Customer name", "Order number", "Item summary", "Total"] },
  { name: "tabedaar_payment_pending", params: ["Customer name", "Order number", "Amount", "Payment reason"] },
  { name: "tabedaar_payment_confirmed", params: ["Customer name", "Order number", "Amount"] },
  { name: "tabedaar_rider_assigned", params: ["Customer name", "Order number", "Rider name"] },
  { name: "tabedaar_items_picked_up", params: ["Customer name", "Order number"] },
  { name: "tabedaar_order_delivered", params: ["Customer name", "Order number", "Total"] },
];

const WINDOW_MS = 24 * 60 * 60 * 1000;
const isWindowOpen = (c: Conversation | null) =>
  !!c?.last_inbound_at && Date.now() - new Date(c.last_inbound_at).getTime() < WINDOW_MS;

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { day: "numeric", month: "short" }) + " " + d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

const callInbox = async (payload: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke("whatsapp-inbox", { body: payload });
  if (error) {
    let detail = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) detail = (await ctx.json())?.message ?? detail;
    } catch { /* ignore */ }
    throw new Error(detail);
  }
  return data;
};

const MediaView = ({ m }: { m: Message }) => {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let revoked: string | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/whatsapp-inbox`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action: "media", messageId: m.id }),
        });
        if (!res.ok) throw new Error("media");
        const blob = await res.blob();
        revoked = URL.createObjectURL(blob);
        if (!cancelled) setUrl(revoked);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (revoked) URL.revokeObjectURL(revoked);
    };
  }, [m.id]);

  if (failed) return <p className="text-xs italic opacity-70">Media unavailable (it may have expired)</p>;
  if (!url) return <Loader2 className="h-4 w-4 animate-spin" />;
  if (m.msg_type === "image" || m.msg_type === "sticker") return <img src={url} alt="Customer attachment" className="max-h-64 rounded-md" />;
  if (m.msg_type === "audio") return <audio controls src={url} className="max-w-full" />;
  if (m.msg_type === "video") return <video controls src={url} className="max-h-64 rounded-md" />;
  return (
    <a href={url} download={m.media_filename ?? "document"} className="flex items-center gap-2 underline">
      <FileText className="h-4 w-4" /> {m.media_filename ?? "Download document"}
    </a>
  );
};

const StatusIcon = ({ status }: { status: string }) => {
  if (status === "failed") return <AlertCircle className="h-3.5 w-3.5 text-destructive" />;
  if (status === "read") return <CheckCheck className="h-3.5 w-3.5 text-blue-400" />;
  if (status === "delivered") return <CheckCheck className="h-3.5 w-3.5" />;
  return <Check className="h-3.5 w-3.5" />;
};

export function InboxPanel() {
  const { isManager, loading: roleLoading } = useManagerCheck();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [templateName, setTemplateName] = useState(TEMPLATES[0].name);
  const [templateParams, setTemplateParams] = useState<string[]>([]);
  const [customer, setCustomer] = useState<{ name: string; orderId: string | null } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selectedId;

  const selected = useMemo(() => conversations.find((c) => c.id === selectedId) ?? null, [conversations, selectedId]);

  const loadConversations = useCallback(async () => {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .order("last_message_at", { ascending: false });
    setConversations((data as Conversation[]) ?? []);
  }, []);

  const loadMessages = useCallback(async (id: string) => {
    const { data } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) ?? []);
  }, []);

  const markRead = useCallback(async (id: string) => {
    try {
      await callInbox({ action: "mark_read", conversationId: id });
    } catch (e) {
      console.error("mark read failed", e);
    }
  }, []);

  useEffect(() => {
    if (!isManager) return;
    loadConversations();
    const channel = supabase
      .channel("wa-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" }, () => loadConversations())
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_messages" }, (payload) => {
        const row = (payload.new ?? {}) as Partial<Message>;
        const cur = selectedRef.current;
        if (cur && row.conversation_id === cur) {
          loadMessages(cur);
          if (payload.eventType === "INSERT" && row.direction === "inbound") markRead(cur);
        }
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [isManager, loadConversations, loadMessages, markRead]);

  useEffect(() => {
    if (!selectedId) return;
    loadMessages(selectedId);
    markRead(selectedId);
  }, [selectedId, loadMessages, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, selectedId]);

  // Link conversation to customer account + latest order (authoritative match only).
  useEffect(() => {
    setCustomer(null);
    if (!selected?.customer_user_id) return;
    let active = true;
    (async () => {
      const [{ data: p }, { data: o }] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", selected.customer_user_id!).maybeSingle(),
        supabase.from("orders").select("id").eq("user_id", selected.customer_user_id!).order("created_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (active && p) setCustomer({ name: p.full_name, orderId: o?.id ?? null });
    })();
    return () => { active = false; };
  }, [selected?.id, selected?.customer_user_id]);

  useEffect(() => {
    const t = TEMPLATES.find((x) => x.name === templateName);
    setTemplateParams(new Array(t?.params.length ?? 0).fill(""));
  }, [templateName]);

  const filtered = conversations.filter((c) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return c.phone.includes(q.replace(/\D/g, "") || "\u0000") || (c.display_name ?? "").toLowerCase().includes(q) ||
      (c.last_message_preview ?? "").toLowerCase().includes(q);
  });

  const send = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      if (isWindowOpen(selected)) {
        if (!text.trim()) return;
        await callInbox({ action: "send_text", conversationId: selected.id, text });
        setText("");
      } else {
        const t = TEMPLATES.find((x) => x.name === templateName)!;
        if (templateParams.some((p) => !p.trim())) {
          toast.error("Fill in all template fields");
          return;
        }
        await callInbox({ action: "send_template", conversationId: selected.id, templateName, params: templateParams });
        toast.success(`Template ${t.name} sent`);
      }
      await loadMessages(selected.id);
    } catch (e) {
      toast.error((e as Error).message || "Could not send message");
    } finally {
      setSending(false);
    }
  };

  if (roleLoading || !isManager) {
    return (
      <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
    );
  }

  const open = isWindowOpen(selected);
  const tpl = TEMPLATES.find((x) => x.name === templateName)!;

  return (
    <div className="flex h-[calc(100dvh-14rem)] min-h-[28rem] overflow-hidden border border-border bg-card sm:rounded-lg">
          {/* Conversation list */}
          <aside className={`${selectedId ? "hidden md:flex" : "flex"} w-full flex-col border-r border-border md:w-80 md:shrink-0`}>
            <div className="space-y-2 border-b border-border p-3">
              <h1 className="text-lg font-semibold">WhatsApp Inbox</h1>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, number, message" className="pl-8" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {filtered.length === 0 && <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>}
              {filtered.map((c) => (
                <Button variant="ghost"
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  className={`flex h-auto w-full items-start gap-3 rounded-none border-b border-border p-3 text-left whitespace-normal transition-colors hover:bg-muted [&>span:first-child]:w-full ${c.id === selectedId ? "bg-muted" : ""}`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate font-medium">{c.display_name || `+${c.phone}`}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{fmtTime(c.last_message_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm text-muted-foreground">{c.last_message_preview}</span>
                      {c.unread_count > 0 && <Badge className="shrink-0 bg-secondary text-secondary-foreground">{c.unread_count}</Badge>}
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </aside>

          {/* Thread */}
          <section className={`${selectedId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`}>
            {!selected ? (
              <div className="flex flex-1 items-center justify-center text-muted-foreground">Select a conversation</div>
            ) : (
              <>
                <div className="flex items-center gap-3 border-b border-border p-3">
                  <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedId(null)} aria-label="Back">
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{selected.display_name || `+${selected.phone}`}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      +{selected.phone}
                      {customer && (
                        <> · Customer: {customer.name}{customer.orderId && (
                          <> · <Link className="underline" to={`/manager/orders/${customer.orderId}`}>Latest order</Link></>
                        )}</>
                      )}
                    </p>
                  </div>
                  <Badge variant={open ? "default" : "outline"} className="shrink-0 gap-1">
                    <Clock className="h-3 w-3" /> {open ? "Window open" : "Window closed"}
                  </Badge>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-3">
                  {messages.map((m) => {
                    const out = m.direction === "outbound";
                    return (
                      <div key={m.id} className={`flex ${out ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm shadow-sm ${out ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"}`}>
                          {m.media_id && <div className="mb-1"><MediaView m={m} /></div>}
                          {!m.media_id && m.msg_type !== "text" && m.msg_type !== "template" && <p className="italic opacity-70">[{m.msg_type} message]</p>}
                          {m.msg_type === "audio" && !m.media_id ? <Mic className="h-4 w-4" /> : null}
                          {m.body && <p className="whitespace-pre-wrap break-words">{m.body}</p>}
                          <div className="mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70">
                            {fmtTime(m.created_at)}
                            {out && <StatusIcon status={m.status} />}
                          </div>
                          {m.status === "failed" && <p className="text-[11px] text-destructive-foreground">{m.error ?? "Failed to deliver"}</p>}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>

                <div className="space-y-2 border-t border-border p-3">
                  {open ? (
                    <div className="flex items-end gap-2">
                      <Textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        placeholder="Type a reply"
                        rows={2}
                        maxLength={4096}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                        }}
                      />
                      <Button loading={sending} onClick={send} disabled={sending || !text.trim()} aria-label="Send">
                        <Send className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        The customer last wrote more than 24 hours ago, so only an approved template can be sent.
                      </p>
                      <Select value={templateName} onValueChange={setTemplateName}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {TEMPLATES.map((t) => <SelectItem key={t.name} value={t.name}>{t.name}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      {tpl.params.map((label, i) => (
                        <Input
                          key={label}
                          placeholder={label}
                          value={templateParams[i] ?? ""}
                          onChange={(e) => setTemplateParams((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
                        />
                      ))}
                      <Button loading={sending} onClick={send} disabled={sending} className="w-full">
                        <Send className="mr-2 h-4 w-4" />
                        Send template
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </section>
    </div>
  );
}

const WhatsAppInboxPage = () => (
  <div className="flex min-h-screen flex-col bg-background">
    <Header />
    <main className="container mx-auto flex-1 px-0 sm:px-4 py-0 sm:py-6">
      <InboxPanel />
    </main>
  </div>
);

export default WhatsAppInboxPage;
