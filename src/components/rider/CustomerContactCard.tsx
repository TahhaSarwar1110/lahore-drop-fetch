import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, MessageCircle, User } from "lucide-react";

interface CustomerContactCardProps {
  customerName: string;
  customerPhone: string;
}

export const CustomerContactCard = ({ customerName, customerPhone }: CustomerContactCardProps) => {
  const handleCall = () => {
    window.open(`tel:${customerPhone}`, "_self");
  };

  const handleWhatsApp = () => {
    const cleanPhone = customerPhone.replace(/[^0-9]/g, "");
    window.open(`https://wa.me/${cleanPhone}`, "_blank");
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <User className="h-5 w-5 text-primary" />
          Customer Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-lg font-bold">
              {customerName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{customerName}</h3>
            <p className="text-sm text-muted-foreground">{customerPhone}</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Button
            className="flex-1"
            onClick={handleCall}
          >
            <Phone className="h-4 w-4 mr-2" />
            Call
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-green-500 text-green-600 hover:bg-green-50 hover:text-green-700"
            onClick={handleWhatsApp}
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
