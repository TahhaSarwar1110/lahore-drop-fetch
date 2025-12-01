import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { AIBotButton } from "@/components/AIBotButton";
import { OrderItemForm, OrderItem as FormOrderItem } from "@/components/OrderItemForm";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Trash2, Plus, Save } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface OrderItem {
  id: string;
  item_type: string;
  item_data: Record<string, string>;
  image_url: string | null;
  approval_status: string | null;
  manager_feedback: string | null;
  approved_at: string | null;
}

interface Order {
  id: string;
  delivery_address: string;
  status: string;
  created_at: string;
  order_items: OrderItem[];
}

const OrderDetails = () => {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("orderId");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItems, setNewItems] = useState<FormOrderItem[]>([]);
  const [itemsToRemove, setItemsToRemove] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/login");
      } else {
        setIsAuthenticated(true);
        if (orderId) {
          loadOrder(orderId, session.user.id);
        }
      }
    });
  }, [navigate, orderId]);

  const loadOrder = async (orderIdParam: string, userId: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        delivery_address,
        status,
        created_at,
        order_items (
          id,
          item_type,
          item_data,
          image_url,
          approval_status,
          manager_feedback,
          approved_at
        )
      `)
      .eq("id", orderIdParam)
      .eq("user_id", userId)
      .single();

    if (error) {
      console.error("Error loading order:", error);
      toast.error("Failed to load order");
      navigate("/order-history");
    } else {
      setOrder(data as Order);
    }
    setLoading(false);
  };

  const handleRemoveItem = (itemId: string) => {
    setItemsToRemove([...itemsToRemove, itemId]);
  };

  const handleAddNewItem = (item: FormOrderItem) => {
    setNewItems([...newItems, item]);
    setShowAddItem(false);
    toast.success("Item added to changes");
  };

  const handleSaveChanges = async () => {
    try {
      // Remove items marked for deletion
      if (itemsToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from("order_items")
          .delete()
          .in("id", itemsToRemove);

        if (deleteError) throw deleteError;
      }

      // Add new items
      if (newItems.length > 0) {
        const itemsToInsert = newItems.map((item) => ({
          order_id: orderId,
          item_type: item.itemType,
          item_data: item.itemData,
          image_url: item.imageUrl || null,
          approval_status: "pending",
        }));

        const { error: insertError } = await supabase
          .from("order_items")
          .insert(itemsToInsert);

        if (insertError) throw insertError;
      }

      toast.success("Order updated successfully");
      
      // Reload order
      const { data: { user } } = await supabase.auth.getUser();
      if (user && orderId) {
        setItemsToRemove([]);
        setNewItems([]);
        loadOrder(orderId, user.id);
      }
    } catch (error) {
      console.error("Error saving changes:", error);
      toast.error("Failed to save changes");
    }
  };

  const hasChanges = itemsToRemove.length > 0 || newItems.length > 0;

  const getFilteredItems = () => {
    if (!order) return [];
    return order.order_items.filter(item => !itemsToRemove.includes(item.id));
  };

  const hasRejectedItems = () => {
    return order?.order_items?.some(
      (item) => item.approval_status === 'rejected' && !itemsToRemove.includes(item.id)
    ) || false;
  };

  const calculateTotal = () => {
    const approvedItems = getFilteredItems().filter(
      (item) => item.approval_status === 'approved'
    );
    return approvedItems.reduce((sum, item) => {
      const itemData = item.item_data as any;
      return sum + (Number(itemData?.expectedPrice) || 0);
    }, 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isAuthenticated={isAuthenticated} />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4">
            <p className="text-center text-muted-foreground">Loading order...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header isAuthenticated={isAuthenticated} />
        <main className="flex-1 py-12">
          <div className="container mx-auto px-4">
            <p className="text-center text-muted-foreground">Order not found</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header isAuthenticated={isAuthenticated} />

      <main className="flex-1 py-12">
        <div className="container mx-auto px-4 max-w-4xl">
          <div className="mb-6">
            <Button variant="outline" onClick={() => navigate("/order-history")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </div>

          {hasRejectedItems() && (
            <Card className="mb-6 border-destructive bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <h3 className="text-destructive font-semibold mb-2">Order Update Required</h3>
                    <p className="text-sm mb-2">
                      Your order has some rejected items that need attention. Please:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-1 ml-2 mb-3">
                      <li>Remove the rejected items from your order, or</li>
                      <li>Replace them with new items, or</li>
                      <li>Contact our customer service for assistance</li>
                    </ul>
                    <p className="text-sm font-medium text-destructive">
                      Note: Rejected items are not included in the total bill calculation.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold">Order Details</h1>
                <p className="text-muted-foreground mt-1">
                  Order #{order.id.slice(0, 8)} - {format(new Date(order.created_at), "PPP")}
                </p>
              </div>
              <Badge className={order.status === "Pending" ? "bg-yellow-500" : "bg-green-500"}>
                {order.status}
              </Badge>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-muted-foreground">
                Delivery Address: {order.delivery_address}
              </p>
              {calculateTotal() > 0 && (
                <p className="text-sm font-medium">
                  Total (Approved Items): <span className="text-primary text-lg">PKR {calculateTotal().toLocaleString()}</span>
                </p>
              )}
            </div>
          </div>

          {hasChanges && (
            <Card className="mb-6 border-primary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">Unsaved Changes</p>
                    <p className="text-sm text-muted-foreground">
                      {itemsToRemove.length > 0 && `${itemsToRemove.length} item(s) to remove`}
                      {itemsToRemove.length > 0 && newItems.length > 0 && ", "}
                      {newItems.length > 0 && `${newItems.length} new item(s) to add`}
                    </p>
                  </div>
                  <Button onClick={handleSaveChanges}>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-4 mb-6">
            <h2 className="text-xl font-semibold">Order Items</h2>
            {getFilteredItems().map((item) => (
              <Card key={item.id} className={itemsToRemove.includes(item.id) ? "opacity-50" : ""}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-primary text-lg">
                      {item.item_type}
                    </p>
                    {item.approval_status && (
                      <Badge
                        variant={
                          item.approval_status === "approved"
                            ? "default"
                            : item.approval_status === "rejected"
                            ? "destructive"
                            : "secondary"
                        }
                      >
                        {item.approval_status}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1 text-sm mb-3">
                    {Object.entries(item.item_data).map(([key, value]) => (
                      <p key={key} className="text-muted-foreground">
                        <span className="font-medium text-foreground">{key}:</span> {value}
                      </p>
                    ))}
                  </div>

                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt="Item"
                      className="mt-3 rounded-lg max-h-48 object-cover"
                    />
                  )}

                  {item.manager_feedback && (
                    <div className="mt-3 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium mb-1">Manager Feedback:</p>
                      <p className="text-sm text-muted-foreground">{item.manager_feedback}</p>
                      {item.approved_at && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {format(new Date(item.approved_at), "PPp")}
                        </p>
                      )}
                    </div>
                  )}

                  {item.approval_status === "rejected" && order.status === "Pending" && (
                    <div className="mt-3">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Remove Item
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Item?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will mark this item for removal. Click "Save Changes" to confirm.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveItem(item.id)}>
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {newItems.map((item, index) => (
              <Card key={`new-${index}`} className="border-primary">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <p className="font-semibold text-primary text-lg">
                      {item.itemType} <Badge variant="secondary">New</Badge>
                    </p>
                  </div>
                  
                  <div className="space-y-1 text-sm">
                    {Object.entries(item.itemData).map(([key, value]) => (
                      <p key={key} className="text-muted-foreground">
                        <span className="font-medium text-foreground">{key}:</span> {value}
                      </p>
                    ))}
                  </div>

                  {item.imageUrl && (
                    <img
                      src={item.imageUrl}
                      alt="Item"
                      className="mt-3 rounded-lg max-h-48 object-cover"
                    />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {order.status === "Pending" && (
            <Card>
              <CardContent className="p-6">
                {!showAddItem ? (
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      Need to replace a rejected item or add more items?
                    </p>
                    <Button onClick={() => setShowAddItem(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add New Item
                    </Button>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Add New Item</h3>
                      <Button variant="outline" onClick={() => setShowAddItem(false)}>
                        Cancel
                      </Button>
                    </div>
                    <OrderItemForm onAddItem={handleAddNewItem} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
      <AIBotButton />
    </div>
  );
};

export default OrderDetails;
