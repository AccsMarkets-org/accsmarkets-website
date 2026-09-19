export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 pb-8">
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 animate-pulse rounded-2xl bg-surface" />
        <div className="flex flex-col gap-2">
          <div className="h-6 w-48 animate-pulse rounded-lg bg-surface" />
          <div className="h-4 w-32 animate-pulse rounded-lg bg-surface" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-28 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
        <div className="h-64 animate-pulse rounded-2xl bg-surface" />
      </div>
    </div>
  );
}
