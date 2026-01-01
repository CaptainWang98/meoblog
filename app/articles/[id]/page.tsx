"use client";

import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { MDXRenderer } from "@/components/mdx-renderer";
import { useEffect, useState } from "react";

interface Article {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  readTime: number;
  content: string;
}

export default function ArticleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchArticle = async () => {
      try {
        const id = params.id as string;
        const response = await fetch(`/api/articles/${id}`);
        
        if (!response.ok) {
          if (response.status === 404) {
            setError("文章不存在");
          } else {
            setError("加载文章失败");
          }
          return;
        }
        
        const data = await response.json();
        setArticle(data);
      } catch (err) {
        setError("加载文章失败");
      } finally {
        setLoading(false);
      }
    };

    fetchArticle();
  }, [params.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded-lg" />
            <div className="h-8 bg-muted rounded w-3/4" />
            <div className="h-4 bg-muted rounded w-1/2" />
          </div>
        </div>
      </main>
    );
  }

  if (error || !article) {
    return (
      <main className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center">
            <p className="text-lg text-destructive mb-4">{error || "文章不存在"}</p>
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              返回文章列表
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Link
          href="/articles"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          返回文章列表
        </Link>
      </div>

      <article className="container mx-auto max-w-3xl px-4 py-8">
        {/* Hero Image */}
        <div className="relative w-full h-96 rounded-lg overflow-hidden mb-8 border border-border">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover"
            priority
            unoptimized
          />
        </div>

        {/* Article Header */}
        <div className="mb-8 space-y-4">
          <h1 className="text-4xl sm:text-5xl font-bold">{article.title}</h1>

          {/* Meta Information */}
          <div className="flex flex-wrap items-center gap-6 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <time dateTime={article.date}>{article.date}</time>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              <span>{article.readTime} min read</span>
            </div>
          </div>

          {/* Excerpt */}
          <p className="text-lg text-muted-foreground">{article.excerpt}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-border my-8" />

        {/* Article Content */}
        <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
          <MDXRenderer content={article.content} />
        </div>

        {/* Article Footer */}
        <div className="border-t border-border mt-12 pt-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="text-sm text-muted-foreground">
              最后更新于 {article.date}
            </div>
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              返回列表
            </Link>
          </div>
        </div>
      </article>
    </main>
  );
}
