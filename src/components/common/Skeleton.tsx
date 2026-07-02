export function MatchCardSkeleton() {
  return (
    <div className="glass-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="skeleton h-3 w-24 rounded" />
        <div className="skeleton h-3 w-16 rounded" />
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 flex-col items-center gap-2">
          <div className="skeleton h-8 w-8 rounded-full" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
        <div className="skeleton h-9 w-20 rounded" />
        <div className="flex flex-1 flex-col items-center gap-2">
          <div className="skeleton h-8 w-8 rounded-full" />
          <div className="skeleton h-3 w-16 rounded" />
        </div>
      </div>
    </div>
  );
}

export function RowSkeleton() {
  return (
    <div className="glass-card mb-2 flex items-center gap-4 p-4">
      <div className="skeleton h-6 w-6 rounded" />
      <div className="skeleton h-8 w-8 rounded-full" />
      <div className="skeleton h-4 flex-1 rounded" />
      <div className="skeleton h-4 w-10 rounded" />
    </div>
  );
}
