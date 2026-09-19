export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="h-8 w-48 animate-pulse rounded-lg bg-surface" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-surface" />
        ))}
      </div>
      <div className="h-64 animate-pulse rounded-2xl bg-surface" />
    </div>
  );
}
