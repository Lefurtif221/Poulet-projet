export default function AdminLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-16 rounded-xl bg-surface-container" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl bg-surface-container" />
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <div className="h-80 rounded-xl bg-surface-container" />
          <div className="h-40 rounded-xl bg-surface-container" />
        </div>
        <div className="space-y-5">
          <div className="h-48 rounded-xl bg-surface-container" />
          <div className="h-48 rounded-xl bg-surface-container" />
        </div>
      </div>
    </div>
  );
}
