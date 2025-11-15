import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export const AIBotButton = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform bg-gradient-to-br from-primary to-accent"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-2xl">🧠 Desi Drop AI Agent</DialogTitle>
          <DialogDescription className="text-base pt-4">
            Our intelligent AI assistant will be live soon! Get ready for instant support,
            smart recommendations, and real-time order assistance.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};
