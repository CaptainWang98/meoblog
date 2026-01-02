export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header Skeleton */}
        <div className="mb-12">
          <div className="h-10 w-48 bg-muted rounded animate-pulse mb-2" />
          <div className="h-6 w-72 bg-muted rounded animate-pulse" />
        </div>

        {/* Articles Grid Skeleton */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="break-inside-avoid">
              <div className="rounded-lg border bg-card overflow-hidden">
                <div className="h-48 bg-muted animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-6 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
