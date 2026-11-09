export default function SupplierLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-20 rounded-xl bg-surface-container" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl bg-surface-container" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="h-56 rounded-xl bg-surface-container" />
          <div className="h-56 rounded-xl bg-surface-container" />
        </div>
        <div className="space-y-4">
          <div className="h-64 rounded-xl bg-surface-container" />
          <div className="h-48 rounded-xl bg-surface-container" />
        </div>
      </div>
    </div>
  );
}
