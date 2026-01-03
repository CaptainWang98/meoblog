import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/lib/generated/prisma/client";

/**
 * 数据库初始化端点
 * 用于在首次部署时创建表结构
 * 
 * 使用方式：
 * curl -X POST https://your-domain.vercel.app/api/db-init \
 *   -H "Authorization: Bearer YOUR_SECRET_KEY"
 */

const INIT_SECRET = process.env.DB_INIT_SECRET;

export async function POST(request: NextRequest) {
  // 验证密钥
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");
  
  if (!INIT_SECRET || token !== INIT_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 使用单独的 SQL 语句，避免多语句执行问题
    const statements = [
      // 创建 articles 表
      `CREATE TABLE IF NOT EXISTS "articles" (
        "id" SERIAL NOT NULL,
        "notionPageId" TEXT,
        "title" TEXT NOT NULL,
        "excerpt" TEXT NOT NULL,
        "content" TEXT NOT NULL,
        "contentType" TEXT NOT NULL DEFAULT 'mdx',
        "image" TEXT NOT NULL,
        "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "readTime" INTEGER NOT NULL DEFAULT 5,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        "notionLastEditedAt" TIMESTAMP(3),
        CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
      )`,
      
      // 创建 articles 的唯一索引
      `CREATE UNIQUE INDEX IF NOT EXISTS "articles_notionPageId_key" ON "articles"("notionPageId")`,
      
      // 创建 notion_images 表
      `CREATE TABLE IF NOT EXISTS "notion_images" (
        "id" SERIAL NOT NULL,
        "notionBlockId" TEXT NOT NULL,
        "notionUrl" TEXT NOT NULL,
        "localPath" TEXT NOT NULL,
        "fileName" TEXT NOT NULL,
        "mimeType" TEXT NOT NULL,
        "size" INTEGER NOT NULL,
        "width" INTEGER,
        "height" INTEGER,
        "articleId" INTEGER,
        "lastSyncedAt" TIMESTAMP(3) NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL,
        CONSTRAINT "notion_images_pkey" PRIMARY KEY ("id")
      )`,
      
      // 创建 notion_images 的索引
      `CREATE UNIQUE INDEX IF NOT EXISTS "notion_images_notionBlockId_key" ON "notion_images"("notionBlockId")`,
      `CREATE INDEX IF NOT EXISTS "notion_images_articleId_idx" ON "notion_images"("articleId")`,
    ];

    // 逐条执行 SQL
    for (const sql of statements) {
      await prisma.$executeRawUnsafe(sql);
    }

    // 添加外键约束（单独处理，因为可能已存在）
    try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "notion_images" 
        ADD CONSTRAINT "notion_images_articleId_fkey" 
        FOREIGN KEY ("articleId") REFERENCES "articles"("id") 
        ON DELETE SET NULL ON UPDATE CASCADE
      `);
    } catch (e) {
      // 外键可能已存在，忽略错误
      if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2010")) {
        console.log("Foreign key may already exist:", e);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: "Database initialized successfully" 
    });
  } catch (error) {
    console.error("Database initialization error:", error);
    return NextResponse.json(
      { error: "Failed to initialize database", details: String(error) },
      { status: 500 }
    );
  }
}
