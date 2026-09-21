import { MessageSquareMore } from "lucide-react";

export default function MessagesPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted">
      <MessageSquareMore className="h-14 w-14 opacity-20" strokeWidth={1.2} aria-hidden />
      <p className="font-medium">Select a conversation</p>
      <p className="text-sm opacity-70">Choose from your inbox to start chatting</p>
    </div>
  );
}
