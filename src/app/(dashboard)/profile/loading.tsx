export default function ProfileLoading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="mb-6 space-y-2">
        <div className="h-8 w-28 rounded-xl bg-black/8 dark:bg-white/8" />
        <div className="h-4 w-80 rounded-lg bg-black/6 dark:bg-white/6" />
      </div>
      {[...Array(3)].map((_, i) => (
        <div key={i} className="glass p-6 space-y-4">
          <div className="h-5 w-40 rounded-lg bg-black/8 dark:bg-white/8" />
          <div className="h-24 w-full rounded-xl bg-black/6 dark:bg-white/6" />
        </div>
      ))}
    </div>
  );
}
