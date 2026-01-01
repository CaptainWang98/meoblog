"use client";

import { useEffect, useRef, useCallback } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArticleCard } from "@/components/article-card";
import { Loader2 } from "lucide-react";
import { Article } from "@/lib/mock-articles";

export default function ArticlesPage() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery({
    queryKey: ["articles"],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/articles?page=${pageParam}&pageSize=12`);
      if (!response.ok) throw new Error("Failed to fetch articles");
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 1,
  });

  const observerTarget = useRef<HTMLDivElement>(null);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const articles = data?.pages.flatMap((page) => page.data) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive mb-2">加载失败</p>
          <p className="text-muted-foreground text-sm">
            {error instanceof Error ? error.message : "未知错误"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold mb-2">文章列表</h1>
          <p className="text-lg text-muted-foreground">
            分享技术见解，探索编程之美
          </p>
        </div>

        {/* Articles Grid - Masonry Layout */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {articles.map((article: Article) => (
            <div key={article.id} className="break-inside-avoid">
              <ArticleCard article={article} />
            </div>
          ))}
        </div>

        {/* Intersection Observer Target */}
        <div
          ref={observerTarget}
          className="flex justify-center items-center py-12"
        >
          {isFetchingNextPage && (
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
              <p className="text-muted-foreground">加载更多...</p>
            </div>
          )}
          {!hasNextPage && articles.length > 0 && (
            <p className="text-muted-foreground">已加载全部文章</p>
          )}
        </div>
      </div>
    </main>
  );
}
