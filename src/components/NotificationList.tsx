import { formatDistanceToNow } from "date-fns";
import { Check, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNavigate } from "react-router-dom";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  order_id: string | null;
  is_read: boolean;
  created_at: string;
}

interface NotificationListProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
}

export const NotificationList = ({ notifications, onMarkAsRead }: NotificationListProps) => {
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }
    if (notification.order_id) {
      navigate(`/order-details?orderId=${notification.order_id}`);
    }
  };

  if (notifications.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No notifications</p>
      </div>
    );
  }

  return (
    <ScrollArea className="h-full">
      <div className="p-2">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="font-semibold">Notifications</h3>
        </div>
        <div className="space-y-1">
          {notifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg cursor-pointer transition-colors ${
                notification.is_read ? 'bg-muted/50' : 'bg-primary/10 hover:bg-primary/20'
              }`}
              onClick={() => handleNotificationClick(notification)}
            >
              <div className="flex items-start gap-3">
                <Package className="h-5 w-5 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-sm">{notification.title}</p>
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead(notification.id);
                        }}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </ScrollArea>
  );
};

const Bell = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
  </svg>
);
