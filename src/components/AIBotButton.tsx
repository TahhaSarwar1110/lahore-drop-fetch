import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ChatInterface } from "./ChatInterface";

export const AIBotButton = () => {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform bg-gradient-to-br from-primary to-accent z-50"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[700px] p-0">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-2xl flex items-center gap-2">
            <span className="text-3xl">🤖</span> Desi Drop AI Assistant
          </DialogTitle>
        </DialogHeader>
        <ChatInterface />
      </DialogContent>
    </Dialog>
  );
};
