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
  // Rendered as a real anchor (not window.open) so the browser performs a
  // top-level navigation. WhatsApp blocks framed loads (ERR_BLOCKED_BY_RESPONSE),
  // which is what happens when window.open is called inside an embedded preview.
  return (
    <Button variant={variant} className={className} asChild>
      <a
        href={buildWhatsAppUrl(phone, message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Chat on WhatsApp with ${phone}`}
      >
        <MessageCircle className="h-4 w-4 mr-2" />
        {label}
      </a>
    </Button>
  );
};
