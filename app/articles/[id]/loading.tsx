export default function Loading() {
  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-4">
        <div className="h-6 w-32 bg-muted rounded animate-pulse" />
      </div>

      <article className="container mx-auto max-w-3xl px-4 py-8">
        {/* Hero Image Skeleton */}
        <div className="w-full h-96 rounded-lg bg-muted animate-pulse mb-8" />

        {/* Title Skeleton */}
        <div className="mb-8 space-y-4">
          <div className="h-12 bg-muted rounded animate-pulse w-3/4" />
          <div className="flex gap-6">
            <div className="h-5 w-32 bg-muted rounded animate-pulse" />
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>
          <div className="h-6 bg-muted rounded animate-pulse" />
        </div>

        <div className="border-t border-border my-8" />

        {/* Content Skeleton */}
        <div className="space-y-4">
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-5/6" />
          <div className="h-4 bg-muted rounded animate-pulse w-4/6" />
          <div className="h-4 bg-muted rounded animate-pulse" />
          <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
        </div>
      </article>
    </main>
  );
}
