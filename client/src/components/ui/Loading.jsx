export function Spinner({ size = 18, className = "" }) {
  return (
    <span
      className={`inline-block animate-spin rounded-full border-2 border-current border-r-transparent ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}

export function PageLoading({ label = "Loading…" }) {
  return (
    <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-white/85">
      <Spinner size={28} />
      <p className="text-[14px] font-semibold">{label}</p>
    </div>
  );
}

export function CardGridSkeleton({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-[20px] bg-white/95 shadow-[0_16px_40px_rgb(4_20_80/0.22)]">
          <div className="aspect-[4/3] animate-pulse bg-[#e9effb]" />
          <div className="space-y-2.5 p-4">
            <div className="h-2.5 w-20 animate-pulse rounded-full bg-[#e9effb]" />
            <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#e9effb]" />
            <div className="h-3 w-3/5 animate-pulse rounded-full bg-[#e9effb]" />
          </div>
        </div>
      ))}
    </div>
  );
}
