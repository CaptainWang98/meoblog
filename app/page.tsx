import { prisma } from "@/lib/prisma";
import { ArticleList } from "@/components/article-list";

// 使用动态渲染，在运行时获取数据库数据
export const dynamic = "force-dynamic";

export default async function Home() {
  // 在服务端获取首屏数据
  const pageSize = 12;
  
  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      take: pageSize,
      orderBy: { date: "desc" },
      select: {
        id: true,
        title: true,
        excerpt: true,
        image: true,
        date: true,
        readTime: true,
      },
    }),
    prisma.article.count(),
  ]);

  const hasMore = articles.length < total;

  // 序列化日期
  const serializedArticles = articles.map((article) => ({
    ...article,
    date: article.date.toISOString(),
  }));

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

        {/* Article List with infinite scroll */}
        <ArticleList 
          initialArticles={serializedArticles} 
          initialHasMore={hasMore} 
        />
      </div>
    </main>
  );
}
