import { supabase } from "@/integrations/supabase/client";

/** Business events understood by the `notify` edge function. */
export type NotificationEvent =
  | "order_placed"
  | "order_received"
  | "order_review_required"
  | "item_approval_required"
  | "item_approved"
  | "item_rejected"
  | "order_confirmation_required"
  | "order_confirmed"
  | "payment_requested"
  | "payment_submitted"
  | "payment_confirmed"
  | "delivery_payment_requested"
  | "delivery_payment_submitted"
  | "delivery_payment_confirmed"
  | "order_processing"
  | "rider_assigned"
  | "order_ready_for_pickup"
  | "order_picked_up"
  | "order_out_for_delivery"
  | "order_delivered"
  | "order_cancelled"
  | "order_status_changed"
  | "delivery_issue";

interface NotifyParams {
  event_type: NotificationEvent;
  order_id?: string;
  /** Makes repeated events of the same type unique (item id, status, attempt) */
  event_version?: string;
  item_name?: string;
  amount?: number | string;
  status?: string;
  note?: string;
}

/**
 * Emits a business event. The backend resolves recipients, writes the in-app
 * notification (idempotently) and fans out to web/native push.
 * Never throws — notification failures must not break order/payment flows.
 */
export const triggerNotification = async (params: NotifyParams) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.functions.invoke("notify", { body: params });
    if (error) throw error;
  } catch (error) {
    console.error("Notification event failed:", params.event_type, error);
  }
};
