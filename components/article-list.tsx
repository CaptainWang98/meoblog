"use client";

import { useEffect, useRef } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ArticleCard } from "@/components/article-card";
import { Loader2 } from "lucide-react";

export interface Article {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  readTime: number;
}

interface ArticleListProps {
  initialArticles: Article[];
  initialHasMore: boolean;
}

export function ArticleList({ initialArticles, initialHasMore }: ArticleListProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["articles"],
    queryFn: async ({ pageParam = 2 }) => {
      // 从第 2 页开始，因为第 1 页已经由 SSR 提供
      const response = await fetch(`/api/articles?page=${pageParam}&pageSize=12`);
      if (!response.ok) throw new Error("Failed to fetch articles");
      return response.json();
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined;
    },
    initialPageParam: 2,
    // 使用 SSR 数据作为初始数据
    initialData: {
      pages: [{ data: initialArticles, page: 1, hasMore: initialHasMore }],
      pageParams: [1],
    },
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

  return (
    <>
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
    </>
  );
}
