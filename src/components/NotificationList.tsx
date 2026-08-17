import { formatDistanceToNow } from "date-fns";
import { Bell, Check, CheckCheck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";
import type { AppNotification } from "@/hooks/useNotifications";

interface NotificationListProps {
  notifications: AppNotification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead?: () => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
  loadingMore?: boolean;
  showFooterLink?: boolean;
}

export const NotificationList = ({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onLoadMore,
  hasMore,
  loadingMore,
  showFooterLink,
}: NotificationListProps) => {
  const navigate = useNavigate();

  const handleNotificationClick = (notification: AppNotification) => {
    if (!notification.is_read) onMarkAsRead(notification.id);
    const target =
      notification.link_url ||
      (notification.order_id ? `/order-details?orderId=${notification.order_id}` : null);
    if (target) navigate(target);
  };

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No notifications</p>
      </div>
    );
  }

  const unread = notifications.some((n) => !n.is_read);

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <div className="mb-2 flex items-center justify-between gap-2 px-2">
          <h3 className="font-semibold">Notifications</h3>
          {unread && onMarkAllAsRead && (
            <Button variant="ghost" size="sm" className="h-7 gap-1 px-2 text-xs" onClick={onMarkAllAsRead}>
              <CheckCheck className="h-3.5 w-3.5" />
              Mark all read
            </Button>
          )}
        </div>
        <div className="space-y-1">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`cursor-pointer rounded-lg p-3 transition-colors ${
                notification.is_read ? "bg-muted/50" : "bg-primary/10 hover:bg-primary/20"
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <Package className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        aria-label="Mark as read"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notification.id);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{notification.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {hasMore && onLoadMore && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full text-xs"
            disabled={loadingMore}
            onClick={onLoadMore}
          >
            {loadingMore ? "Loading..." : "Load more"}
          </Button>
        )}

        {showFooterLink && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full text-xs"
            onClick={() => navigate("/notifications")}
          >
            View all notifications
          </Button>
        )}
      </div>
    </ScrollArea>
  );
};
