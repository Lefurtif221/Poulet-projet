export default function ClientLoading() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="h-52 rounded-2xl bg-surface-container" />
      <div className="flex gap-2">
        <div className="h-8 w-28 rounded-full bg-surface-container" />
        <div className="h-8 w-28 rounded-full bg-surface-container" />
        <div className="h-8 w-24 rounded-full bg-surface-container" />
      </div>
      <div className="h-20 rounded-xl bg-surface-container" />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="overflow-hidden rounded-xl border border-outline-variant/30 bg-white">
            <div className="aspect-[16/10] bg-surface-container" />
            <div className="space-y-2 p-4">
              <div className="h-3 w-1/3 rounded bg-surface-container" />
              <div className="h-4 w-3/4 rounded bg-surface-container" />
              <div className="h-3 w-1/2 rounded bg-surface-container" />
              <div className="h-11 w-full rounded-lg bg-surface-container" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
