export default function AdminMessagesPage() {
  return (
    <div className="flex flex-1 items-center justify-center bg-background">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-surface text-2xl shadow-sm">
          💬
        </div>
        <p className="text-sm font-semibold text-foreground">Select a conversation</p>
        <p className="mt-1 text-xs text-muted">Choose from your inbox to start chatting</p>
      </div>
    </div>
  );
}
