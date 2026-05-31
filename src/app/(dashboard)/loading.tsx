export default function DashboardLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Page heading skeleton */}
      <div className="mb-6 space-y-2">
        <div className="h-8 w-48 rounded-xl bg-black/8 dark:bg-white/8" />
        <div className="h-4 w-72 rounded-lg bg-black/6 dark:bg-white/6" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="glass p-5 space-y-2">
            <div className="h-3 w-20 rounded bg-black/8 dark:bg-white/8" />
            <div className="h-8 w-12 rounded-lg bg-black/8 dark:bg-white/8" />
            <div className="h-3 w-28 rounded bg-black/6 dark:bg-white/6" />
          </div>
        ))}
      </div>
      {/* Content cards */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="glass lg:col-span-2 p-6 space-y-3">
          <div className="h-5 w-40 rounded-lg bg-black/8 dark:bg-white/8" />
          <div className="h-2 w-full rounded-full bg-black/8 dark:bg-white/8" />
          <div className="grid gap-2 sm:grid-cols-2 mt-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-10 rounded-xl bg-black/6 dark:bg-white/6" />
            ))}
          </div>
        </div>
        <div className="glass p-6 space-y-2">
          <div className="h-5 w-24 rounded-lg bg-black/8 dark:bg-white/8" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="flex justify-between">
              <div className="h-4 w-20 rounded bg-black/6 dark:bg-white/6" />
              <div className="h-4 w-6 rounded bg-black/6 dark:bg-white/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
