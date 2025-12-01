import { supabase } from "@/integrations/supabase/client";

interface CreateNotificationParams {
  userId: string;
  title: string;
  message: string;
  type: string;
  orderId?: string;
}

export const createNotification = async (params: CreateNotificationParams) => {
  try {
    const { error } = await supabase
      .from("notifications")
      .insert({
        user_id: params.userId,
        title: params.title,
        message: params.message,
        type: params.type,
        order_id: params.orderId || null,
      });

    if (error) throw error;
    console.log("Notification created successfully");
  } catch (error) {
    console.error("Error creating notification:", error);
  }
};

export const sendNotificationEmail = async (
  userEmail: string,
  userName: string,
  title: string,
  message: string,
  orderLink?: string
) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { error } = await supabase.functions.invoke("send-notification-email", {
      body: {
        userEmail,
        userName,
        title,
        message,
        orderLink,
      },
    });

    if (error) throw error;
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Error sending notification email:", error);
  }
};
