import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
    // 创建 articles 表
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "articles" (
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
      )
    `);

    // 创建 articles 的唯一索引
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "articles_notionPageId_key" 
      ON "articles"("notionPageId")
    `);

    // 创建 notion_images 表
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "notion_images" (
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
      )
    `);

    // 创建 notion_images 的索引
    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "notion_images_notionBlockId_key" 
      ON "notion_images"("notionBlockId")
    `);

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "notion_images_articleId_idx" 
      ON "notion_images"("articleId")
    `);

    // 添加外键约束（如果不存在）
    await prisma.$executeRawUnsafe(`
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE constraint_name = 'notion_images_articleId_fkey'
        ) THEN
          ALTER TABLE "notion_images" 
          ADD CONSTRAINT "notion_images_articleId_fkey" 
          FOREIGN KEY ("articleId") REFERENCES "articles"("id") 
          ON DELETE SET NULL ON UPDATE CASCADE;
        END IF;
      END $$
    `);

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
