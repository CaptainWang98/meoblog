import { NextRequest, NextResponse } from "next/server";
import { generateArticles } from "@/lib/mock-articles";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const page = parseInt(searchParams.get("page") || "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") || "12", 10);

  // 模拟网络延迟
  await new Promise((resolve) => setTimeout(resolve, 500));

  const articles = generateArticles(page, pageSize);

  return NextResponse.json({
    data: articles,
    page,
    pageSize,
    hasMore: page < 10, // 假设最多 10 页
  });
}
