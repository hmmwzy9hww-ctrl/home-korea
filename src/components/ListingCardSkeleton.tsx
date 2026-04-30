export function ListingCardSkeleton() {
  return (
    <article className="bg-card rounded-2xl overflow-hidden border shadow-card">
      <div className="relative w-full aspect-[4/3] bg-muted animate-pulse" />
      <div className="p-3.5 space-y-2.5">
        <div className="flex items-baseline gap-2">
          <div className="h-5 w-20 bg-muted rounded animate-pulse" />
          <div className="h-3 w-12 bg-muted rounded animate-pulse" />
          <div className="ml-auto h-4 w-14 bg-muted rounded-full animate-pulse" />
        </div>
        <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
        <div className="flex gap-1.5">
          <div className="h-5 w-16 bg-muted rounded-md animate-pulse" />
          <div className="h-5 w-20 bg-muted rounded-md animate-pulse" />
          <div className="h-5 w-20 bg-muted rounded-md animate-pulse" />
        </div>
        <div className="space-y-1.5">
          <div className="h-3 w-full bg-muted rounded animate-pulse" />
          <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
        </div>
        <div className="flex gap-2 pt-1">
          <div className="flex-1 h-8 bg-muted rounded-lg animate-pulse" />
          <div className="flex-1 h-8 bg-muted rounded-lg animate-pulse" />
        </div>
      </div>
    </article>
  );
}

export function ListingCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <ListingCardSkeleton key={i} />
      ))}
    </div>
  );
}
