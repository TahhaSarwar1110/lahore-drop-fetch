import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  event_type: string | null;
  order_id: string | null;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}

const PAGE_SIZE = 20;

const SELECT = "id, title, message, type, event_type, order_id, link_url, is_read, created_at";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const userIdRef = useRef<string | null>(null);

  const fetchPage = useCallback(async (userId: string, from: number) => {
    const { data, error } = await supabase
      .from("notifications")
      .select(SELECT)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (error) throw error;
    return (data ?? []) as AppNotification[];
  }, []);

  const refreshUnreadCount = useCallback(async (userId: string) => {
    const { count } = await supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_read", false);
    setUnreadCount(count ?? 0);
  }, []);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let mounted = true;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) {
        setLoading(false);
        return;
      }
      userIdRef.current = user.id;

      try {
        const page = await fetchPage(user.id, 0);
        if (!mounted) return;
        page.forEach((n) => seenIdsRef.current.add(n.id));
        setNotifications(page);
        setHasMore(page.length === PAGE_SIZE);
        await refreshUnreadCount(user.id);
      } catch (error) {
        console.error("Error fetching notifications:", error);
      } finally {
        if (mounted) setLoading(false);
      }

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
            const incoming = payload.new as AppNotification;
            // Idempotent on the client too: never render the same row twice.
            if (seenIdsRef.current.has(incoming.id)) return;
            seenIdsRef.current.add(incoming.id);

            setNotifications((prev) => [incoming, ...prev]);
            setUnreadCount((prev) => prev + 1);

            toast.info(incoming.title, {
              id: `notif-${incoming.id}`,
              description: incoming.message,
              duration: 5000,
            });
          },
        )
        .subscribe();
    };

    init();

    return () => {
      mounted = false;
      if (channel) supabase.removeChannel(channel);
    };
  }, [fetchPage, refreshUnreadCount]);

  const loadMore = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId || loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const page = await fetchPage(userId, notifications.length);
      page.forEach((n) => seenIdsRef.current.add(n.id));
      setNotifications((prev) => {
        const existing = new Set(prev.map((n) => n.id));
        return [...prev, ...page.filter((n) => !existing.has(n.id))];
      });
      setHasMore(page.length === PAGE_SIZE);
    } catch (error) {
      console.error("Error loading more notifications:", error);
    } finally {
      setLoadingMore(false);
    }
  }, [fetchPage, hasMore, loadingMore, notifications.length]);

  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);
      if (error) throw error;

      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", userId)
        .eq("is_read", false);
      if (error) throw error;

      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      toast.error("Failed to mark all as read");
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    const userId = userIdRef.current;
    if (!userId) return;
    const page = await fetchPage(userId, 0);
    page.forEach((n) => seenIdsRef.current.add(n.id));
    setNotifications(page);
    setHasMore(page.length === PAGE_SIZE);
    await refreshUnreadCount(userId);
  }, [fetchPage, refreshUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
    refreshNotifications,
  };
};
