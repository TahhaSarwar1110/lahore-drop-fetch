import { supabase } from "@/integrations/supabase/client";

interface WhatsAppNotificationParams {
  /** App user to notify (phone taken from their profile) */
  userId?: string;
  /** Or notify every holder of a role, e.g. "manager" */
  role?: "manager" | "admin" | "rider" | "customer";
  /** Or an explicit phone number */
  phone?: string;
  message: string;
  templateName?: string;
  templateLanguage?: string;
  templateParams?: string[];
}

/**
 * Fires an automated WhatsApp message via the `send-whatsapp` edge function.
 * Never throws — WhatsApp delivery must not block the core order flow.
 */
export const sendWhatsAppNotification = async (
  params: WhatsAppNotificationParams
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.functions.invoke("send-whatsapp", {
      body: params,
    });

    if (error) throw error;
  } catch (error) {
    console.error("Error sending WhatsApp notification:", error);
  }
};
