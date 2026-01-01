import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "12", 10);

  // 模拟网络延迟（可选）
  await new Promise((resolve) => setTimeout(resolve, 300));

  // 从数据库获取文章
  const skip = (page - 1) * pageSize;
  
  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      skip,
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

  const hasMore = skip + articles.length < total;

  return NextResponse.json({
    data: articles.map((article) => ({
      ...article,
      date: article.date.toISOString(),
    })),
    page,
    pageSize,
    hasMore,
    total,
  });
}
