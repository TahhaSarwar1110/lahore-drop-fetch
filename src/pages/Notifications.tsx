import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { NotificationList } from "@/components/NotificationList";
import { useNotifications } from "@/hooks/useNotifications";

const Notifications = () => {
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    loadMore,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <main className="container mx-auto flex-1 px-3 py-6 md:px-4 md:py-10">
        <div className="mx-auto max-w-2xl">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold md:text-3xl">Notifications</h1>
              <p className="text-sm text-muted-foreground">
                {unreadCount > 0 ? `${unreadCount} unread` : "You're all caught up"}
              </p>
            </div>
            <Button asChild variant="outline" size="sm" className="gap-2">
              <Link to="/settings/notifications">
                <Settings className="h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>

          <Card className="p-2">
            {loading ? (
              <p className="p-6 text-center text-sm text-muted-foreground">Loading notifications...</p>
            ) : (
              <NotificationList
                notifications={notifications}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onLoadMore={loadMore}
                hasMore={hasMore}
                loadingMore={loadingMore}
              />
            )}
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Notifications;
