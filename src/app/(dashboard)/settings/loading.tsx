export default function SettingsLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="mb-6 space-y-2">
        <div className="h-8 w-32 rounded-xl bg-black/8 dark:bg-white/8" />
        <div className="h-4 w-96 rounded-lg bg-black/6 dark:bg-white/6" />
      </div>
      {/* Tab bar skeleton */}
      <div className="h-11 w-72 rounded-[14px] bg-black/6 dark:bg-white/6" />
      {/* Content skeleton */}
      <div className="max-w-2xl space-y-4">
        <div className="glass p-6 space-y-3">
          <div className="h-5 w-36 rounded-lg bg-black/8 dark:bg-white/8" />
          <div className="flex flex-wrap gap-2">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-10 w-28 rounded-xl bg-black/6 dark:bg-white/6" />
            ))}
          </div>
        </div>
        <div className="glass p-6 space-y-3">
          <div className="h-5 w-36 rounded-lg bg-black/8 dark:bg-white/8" />
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-14 w-full rounded-xl bg-black/6 dark:bg-white/6" />
          ))}
        </div>
      </div>
    </div>
  );
}
