import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Calendar, Clock } from "lucide-react";
import { MDXRenderer } from "@/components/mdx-renderer";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { Metadata } from "next";

interface PageProps {
  params: Promise<{ id: string }>;
}

// 生成动态 metadata（SEO）
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const articleId = parseInt(id, 10);
  
  if (isNaN(articleId)) {
    return { title: "文章不存在" };
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { title: true, excerpt: true, image: true },
  });

  if (!article) {
    return { title: "文章不存在" };
  }

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      title: article.title,
      description: article.excerpt,
      images: [article.image],
    },
  };
}

export default async function ArticleDetailPage({ params }: PageProps) {
  const { id } = await params;
  const articleId = parseInt(id, 10);

  if (isNaN(articleId)) {
    notFound();
  }

  const article = await prisma.article.findUnique({
    where: { id: articleId },
  });

  if (!article) {
    notFound();
  }

  const formattedDate = article.date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <main className="min-h-screen bg-background">
      {/* Back Button */}
      <div className="container mx-auto px-4 py-4">
        <Link
          href="/"
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
              <time dateTime={article.date.toISOString()}>{formattedDate}</time>
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
              最后更新于 {formattedDate}
            </div>
            <Link
              href="/"
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
