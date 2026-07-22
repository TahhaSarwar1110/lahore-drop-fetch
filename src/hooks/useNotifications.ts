import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const seenIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(50);

        if (error) throw error;
        if (!mounted) return;

        (data || []).forEach((n) => seenIdsRef.current.add(n.id));
        setNotifications(data || []);
        setUnreadCount((data || []).filter((n) => !n.is_read).length);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        if (mounted) setLoading(false);
      }

      // Scope realtime to this user's notifications only
      channel = supabase
        .channel(`notifications-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            if (seenIdsRef.current.has(newNotification.id)) return;
            seenIdsRef.current.add(newNotification.id);

            setNotifications((prev) => [newNotification, ...prev]);
            setUnreadCount((prev) => prev + 1);

            toast.info(newNotification.title, {
              id: `notif-${newNotification.id}`,
              description: newNotification.message,
              duration: 5000,
            });
          }
        )
        .subscribe();
    };

    init();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const refreshNotifications = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    (data || []).forEach((n) => seenIdsRef.current.add(n.id));
    setNotifications(data || []);
    setUnreadCount((data || []).filter((n) => !n.is_read).length);
  };

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    refreshNotifications,
  };
};
