import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { buildWhatsAppUrl } from "@/utils/whatsapp";

interface WhatsAppButtonProps {
  phone: string;
  message?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  className?: string;
}

export const WhatsAppButton = ({
  phone,
  message,
  label = "WhatsApp",
  variant = "outline",
  className,
}: WhatsAppButtonProps) => {
  const handleClick = () => {
    window.open(buildWhatsAppUrl(phone, message), "_blank", "noopener,noreferrer");
  };

  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleClick}
      aria-label={`Chat on WhatsApp with ${phone}`}
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
};
