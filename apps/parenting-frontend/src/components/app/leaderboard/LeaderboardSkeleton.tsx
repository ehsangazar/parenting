export const LeaderboardSkeleton = () => (
  <div className="flex flex-col gap-4">
    {/* Podium skeleton */}
    <div className="flex items-end justify-center gap-3 pt-4">
      {[28, 36, 24].map((h, i) => (
        <div
          key={i}
          className="animate-pulse rounded-2xl bg-surface"
          style={{ width: 88, height: h * 4 }}
        />
      ))}
    </div>

    {/* List skeleton */}
    <div className="flex flex-col gap-2">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse flex items-center gap-3 rounded-xl bg-surface px-4 py-3">
          <div className="h-5 w-5 shrink-0 rounded bg-[#E8EDFF]" />
          <div className="h-8 w-8 shrink-0 rounded-full bg-[#E8EDFF]" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3 w-1/3 rounded bg-[#E8EDFF]" />
            <div className="h-2.5 w-1/5 rounded bg-[#E8EDFF]" />
          </div>
          <div className="h-3 w-10 rounded bg-[#E8EDFF]" />
        </div>
      ))}
    </div>
  </div>
);
