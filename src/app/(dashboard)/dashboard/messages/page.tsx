export default function MessagesPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center text-muted">
      <svg
        className="h-14 w-14 opacity-20"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={1.2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 10h.01M12 10h.01M16 10h.01M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z"
        />
      </svg>
      <p className="font-medium">Select a conversation</p>
      <p className="text-sm opacity-70">Choose from your inbox to start chatting</p>
    </div>
  );
}
