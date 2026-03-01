import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useManagerCheck } from "@/hooks/useManagerCheck";

interface PricingBundle {
  id: string;
  name: string;
  price: number;
  items_allowed: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const PricingManagement = () => {
  const { isManager, loading: roleLoading } = useManagerCheck();
  const [bundles, setBundles] = useState<PricingBundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingBundle, setEditingBundle] = useState<PricingBundle | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    items_allowed: "",
    description: "",
    is_active: true,
  });

  useEffect(() => {
    if (isManager) {
      fetchBundles();
    }
  }, [isManager]);

  const fetchBundles = async () => {
    try {
      const { data, error } = await supabase
        .from("pricing_bundles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching bundles:", error);
        throw error;
      }
      setBundles(data || []);
    } catch (error) {
      console.error("Error fetching bundles:", error);
      toast.error("Failed to load pricing bundles");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.items_allowed) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      const bundleData = {
        name: formData.name,
        price: parseFloat(formData.price),
        items_allowed: parseInt(formData.items_allowed),
        description: formData.description || null,
        is_active: formData.is_active,
      };

      if (editingBundle) {
        const { error } = await supabase
          .from("pricing_bundles")
          .update(bundleData)
          .eq("id", editingBundle.id);

        if (error) throw error;
        toast.success("Bundle updated successfully");
      } else {
        const { error } = await supabase
          .from("pricing_bundles")
          .insert(bundleData);

        if (error) throw error;
        toast.success("Bundle created successfully");
      }

      setDialogOpen(false);
      resetForm();
      fetchBundles();
    } catch (error) {
      console.error("Error saving bundle:", error);
      toast.error("Failed to save bundle");
    }
  };

  const handleEdit = (bundle: PricingBundle) => {
    setEditingBundle(bundle);
    setFormData({
      name: bundle.name,
      price: bundle.price.toString(),
      items_allowed: bundle.items_allowed.toString(),
      description: bundle.description || "",
      is_active: bundle.is_active,
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this bundle?")) return;

    try {
      const { error } = await supabase
        .from("pricing_bundles")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Bundle deleted successfully");
      fetchBundles();
    } catch (error) {
      console.error("Error deleting bundle:", error);
      toast.error("Failed to delete bundle");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      price: "",
      items_allowed: "",
      description: "",
      is_active: true,
    });
    setEditingBundle(null);
  };

  const handleDialogClose = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      resetForm();
    }
  };

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2">Pricing Management</h1>
            <p className="text-muted-foreground">Create and manage pricing bundles</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={handleDialogClose}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Bundle
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingBundle ? "Edit" : "Create"} Pricing Bundle</DialogTitle>
                <DialogDescription>
                  {editingBundle ? "Update" : "Add"} pricing bundle details below
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Bundle Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Standard Bundle"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Price *</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="items_allowed">Items Allowed *</Label>
                    <Input
                      id="items_allowed"
                      type="number"
                      value={formData.items_allowed}
                      onChange={(e) => setFormData({ ...formData, items_allowed: e.target.value })}
                      placeholder="e.g., 5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Bundle description..."
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => handleDialogClose(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingBundle ? "Update" : "Create"} Bundle
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pricing Bundles</CardTitle>
            <CardDescription>Manage all pricing bundles</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Items Allowed</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bundles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No pricing bundles found
                    </TableCell>
                  </TableRow>
                ) : (
                  bundles.map((bundle) => (
                    <TableRow key={bundle.id}>
                      <TableCell className="font-medium">{bundle.name}</TableCell>
                      <TableCell>${bundle.price.toFixed(2)}</TableCell>
                      <TableCell>{bundle.items_allowed} items</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${bundle.is_active ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                          {bundle.is_active ? "Active" : "Inactive"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEdit(bundle)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleDelete(bundle.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};
