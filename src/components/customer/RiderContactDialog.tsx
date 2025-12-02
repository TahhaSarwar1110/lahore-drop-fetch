import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Phone, User } from "lucide-react";

interface RiderContactDialogProps {
  riderName: string;
  riderPhone: string;
  children: React.ReactNode;
}

export const RiderContactDialog = ({
  riderName,
  riderPhone,
  children,
}: RiderContactDialogProps) => {
  return (
    <Dialog>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Rider Details
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary text-2xl font-bold">
                {riderName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h3 className="text-lg font-semibold">{riderName}</h3>
              <p className="text-muted-foreground">Delivery Rider</p>
            </div>
          </div>

          <div className="bg-muted/50 p-4 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span className="font-medium">Contact Number</span>
            </div>
            <p className="text-lg">{riderPhone}</p>
          </div>

          <div className="flex gap-2">
            <Button
              className="flex-1"
              onClick={() => window.open(`tel:${riderPhone}`, "_self")}
            >
              <Phone className="h-4 w-4 mr-2" />
              Call Rider
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() =>
                window.open(
                  `https://wa.me/${riderPhone.replace(/[^0-9]/g, "")}`,
                  "_blank"
                )
              }
            >
              WhatsApp
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
