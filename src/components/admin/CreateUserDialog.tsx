import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserPlus, Loader2, Upload, X, FileText, Image } from "lucide-react";

interface CreateUserDialogProps {
  onUserCreated: () => void;
}

type AppRole = "admin" | "rider" | "customer" | "user" | "manager";

interface FormData {
  email: string;
  password: string;
  full_name: string;
  phone: string;
  role: AppRole;
  // Additional fields for manager/rider
  cnic_number: string;
  permanent_address: string;
  alternative_contact: string;
}

export const CreateUserDialog = ({ onUserCreated }: CreateUserDialogProps) => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    email: "",
    password: "",
    full_name: "",
    phone: "",
    role: "customer",
    cnic_number: "",
    permanent_address: "",
    alternative_contact: "",
  });
  
  // File states
  const [idCardFile, setIdCardFile] = useState<File | null>(null);
  const [utilityBillFile, setUtilityBillFile] = useState<File | null>(null);
  const idCardInputRef = useRef<HTMLInputElement>(null);
  const utilityBillInputRef = useRef<HTMLInputElement>(null);

  const requiresAdditionalInfo = formData.role === "manager" || formData.role === "rider";

  const resetForm = () => {
    setFormData({
      email: "",
      password: "",
      full_name: "",
      phone: "",
      role: "customer",
      cnic_number: "",
      permanent_address: "",
      alternative_contact: "",
    });
    setIdCardFile(null);
    setUtilityBillFile(null);
  };

  const uploadFile = async (file: File, userId: string, type: 'id-card' | 'utility-bill') => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/${type}-${Date.now()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('user-documents')
      .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('user-documents')
      .getPublicUrl(fileName);

    return { url: urlData.publicUrl, name: file.name };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate additional fields for manager/rider
    if (requiresAdditionalInfo) {
      if (!formData.cnic_number.trim()) {
        toast.error("CNIC number is required for manager/rider");
        return;
      }
      if (!formData.permanent_address.trim()) {
        toast.error("Permanent address is required for manager/rider");
        return;
      }
      if (!idCardFile) {
        toast.error("ID card attachment is required for manager/rider");
        return;
      }
      if (!utilityBillFile) {
        toast.error("Utility bill attachment is required for manager/rider");
        return;
      }
    }
    
    setLoading(true);

    try {
      // Create user via edge function
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
          phone: formData.phone,
          role: formData.role,
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      const userId = data.userId;

      // If manager/rider, upload files and save additional details
      if (requiresAdditionalInfo && userId) {
        let idCardData = { url: '', name: '' };
        let utilityBillData = { url: '', name: '' };

        if (idCardFile) {
          idCardData = await uploadFile(idCardFile, userId, 'id-card');
        }
        if (utilityBillFile) {
          utilityBillData = await uploadFile(utilityBillFile, userId, 'utility-bill');
        }

        // Insert user details
        const { error: detailsError } = await supabase
          .from('user_details')
          .insert({
            user_id: userId,
            cnic_number: formData.cnic_number,
            permanent_address: formData.permanent_address,
            alternative_contact: formData.alternative_contact || null,
            id_card_url: idCardData.url,
            id_card_name: idCardData.name,
            utility_bill_url: utilityBillData.url,
            utility_bill_name: utilityBillData.name,
          });

        if (detailsError) {
          console.error("Error saving user details:", detailsError);
          toast.error("User created but failed to save additional details");
        }
      }

      toast.success("User created successfully!");
      setOpen(false);
      resetForm();
      onUserCreated();
    } catch (error: any) {
      console.error("Error creating user:", error);
      toast.error(error.message || "Failed to create user");
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (
    e: React.ChangeEvent<HTMLInputElement>,
    setFile: (file: File | null) => void
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error("Please upload an image (JPG, PNG, WebP) or PDF file");
        return;
      }
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setFile(file);
    }
  };

  const FileUploadField = ({
    label,
    file,
    setFile,
    inputRef,
    required = false,
  }: {
    label: string;
    file: File | null;
    setFile: (file: File | null) => void;
    inputRef: React.RefObject<HTMLInputElement>;
    required?: boolean;
  }) => (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <input
        type="file"
        ref={inputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,application/pdf"
        onChange={(e) => handleFileSelect(e, setFile)}
      />
      {file ? (
        <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
          {file.type.startsWith('image/') ? (
            <Image className="h-4 w-4 text-primary" />
          ) : (
            <FileText className="h-4 w-4 text-primary" />
          )}
          <span className="text-sm flex-1 truncate">{file.name}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={() => setFile(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4 mr-2" />
          Upload {label}
        </Button>
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Add New User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Add a new user to the system with their role and credentials.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Basic Fields */}
            <div className="space-y-2">
              <Label htmlFor="full_name">Full Name <span className="text-destructive">*</span></Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone <span className="text-destructive">*</span></Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password <span className="text-destructive">*</span></Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                minLength={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role <span className="text-destructive">*</span></Label>
              <Select
                value={formData.role}
                onValueChange={(value: AppRole) => setFormData({ ...formData, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customer">Customer</SelectItem>
                  <SelectItem value="rider">Rider</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Additional Fields for Manager/Rider */}
            {requiresAdditionalInfo && (
              <>
                <div className="border-t pt-4 mt-2">
                  <p className="text-sm font-medium text-muted-foreground mb-4">
                    Additional Information (Required for {formData.role})
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="cnic_number">
                    CNIC Number <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="cnic_number"
                    placeholder="e.g., 35201-1234567-8"
                    value={formData.cnic_number}
                    onChange={(e) => setFormData({ ...formData, cnic_number: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="permanent_address">
                    Permanent Address <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="permanent_address"
                    placeholder="Enter full permanent address"
                    value={formData.permanent_address}
                    onChange={(e) => setFormData({ ...formData, permanent_address: e.target.value })}
                    rows={2}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alternative_contact">Alternative Contact</Label>
                  <Input
                    id="alternative_contact"
                    type="tel"
                    placeholder="Emergency or alternative phone number"
                    value={formData.alternative_contact}
                    onChange={(e) => setFormData({ ...formData, alternative_contact: e.target.value })}
                  />
                </div>

                <FileUploadField
                  label="ID Card (CNIC)"
                  file={idCardFile}
                  setFile={setIdCardFile}
                  inputRef={idCardInputRef}
                  required
                />

                <FileUploadField
                  label="Electricity Bill"
                  file={utilityBillFile}
                  setFile={setUtilityBillFile}
                  inputRef={utilityBillInputRef}
                  required
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
