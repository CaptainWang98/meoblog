import { NextRequest, NextResponse } from "next/server";
import { notion, NOTION_DATABASE_ID, getPropertyValue, estimateReadTime, NotionBlock } from "@/lib/notion";
import { 
  downloadImage, 
  extractImagesFromBlocks, 
  replaceImageUrls,
  ensureImageDir,
  deleteImage 
} from "@/lib/image-storage";
import { prisma } from "@/lib/prisma";

// Webhook 密钥验证（可选但推荐）
const WEBHOOK_SECRET = process.env.NOTION_WEBHOOK_SECRET;

interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
  last_edited_time: string;
  cover?: {
    type: "file" | "external";
    file?: { url: string };
    external?: { url: string };
  };
}

async function getPageBlocks(pageId: string): Promise<NotionBlock[]> {
  const blocks: NotionBlock[] = [];
  let cursor: string | undefined;

  do {
    const response = await notion.blocks.children.list({
      block_id: pageId,
      start_cursor: cursor,
      page_size: 100,
    });

    blocks.push(...(response.results as unknown as NotionBlock[]));
    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  // 递归获取嵌套块
  for (const block of blocks) {
    if (block.has_children) {
      const childBlocks = await getPageBlocks(block.id);
      (block as Record<string, unknown>).children = childBlocks;
    }
  }

  return blocks;
}

/**
 * 同步文章中的所有图片
 */
async function syncArticleImages(
  articleId: number,
  blocks: NotionBlock[]
): Promise<Map<string, string>> {
  const urlMap = new Map<string, string>();
  const images = extractImagesFromBlocks(blocks as unknown[]);

  if (images.length === 0) {
    return urlMap;
  }

  // 获取该文章已有的图片记录
  const existingImages = await prisma.notionImage.findMany({
    where: { articleId },
    select: { notionBlockId: true, localPath: true, fileName: true },
  });
  const existingMap = new Map(existingImages.map(img => [img.notionBlockId, img]));

  // 收集当前文章中的所有图片块 ID
  const currentBlockIds = new Set(images.map(img => img.blockId));

  // 删除不再存在的图片
  for (const existing of existingImages) {
    if (!currentBlockIds.has(existing.notionBlockId)) {
      await deleteImage(existing.fileName);
      await prisma.notionImage.delete({
        where: { notionBlockId: existing.notionBlockId },
      });
    }
  }

  // 下载和更新图片
  for (const image of images) {
    const existing = existingMap.get(image.blockId);

    // 如果图片是外部链接（非 Notion 托管），直接使用原 URL
    if (image.type === "external" && !image.url.includes("notion")) {
      urlMap.set(image.blockId, image.url);
      continue;
    }

    // 如果已存在，使用本地路径
    if (existing) {
      urlMap.set(image.blockId, existing.localPath);
      await prisma.notionImage.update({
        where: { notionBlockId: image.blockId },
        data: { 
          notionUrl: image.url,
          lastSyncedAt: new Date(),
        },
      });
      continue;
    }

    // 下载新图片
    const result = await downloadImage(image.url, image.blockId);

    if (result.success && result.localPath) {
      urlMap.set(image.blockId, result.localPath);
      await prisma.notionImage.create({
        data: {
          notionBlockId: image.blockId,
          notionUrl: image.url,
          localPath: result.localPath,
          fileName: result.fileName!,
          mimeType: result.mimeType!,
          size: result.size!,
          articleId,
          lastSyncedAt: new Date(),
        },
      });
    } else {
      urlMap.set(image.blockId, image.url);
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  return urlMap;
}

/**
 * 下载封面图片
 */
async function downloadCoverImage(
  coverUrl: string,
  notionPageId: string
): Promise<string> {
  if (!coverUrl.includes("notion") && !coverUrl.includes("amazonaws")) {
    return coverUrl;
  }

  const blockId = `cover-${notionPageId}`;
  const result = await downloadImage(coverUrl, blockId);

  return result.success && result.localPath ? result.localPath : coverUrl;
}

async function syncSinglePage(pageId: string) {
  ensureImageDir();
  // 获取页面详情
  const page = await notion.pages.retrieve({ page_id: pageId }) as unknown as NotionPage;
  const lastEditedTime = new Date(page.last_edited_time);

  // 检查是否需要更新
  const existingArticle = await prisma.article.findUnique({
    where: { notionPageId: pageId },
    select: { id: true, notionLastEditedAt: true },
  });

  if (
    existingArticle?.notionLastEditedAt &&
    existingArticle.notionLastEditedAt >= lastEditedTime
  ) {
    return { status: "skipped", reason: "Not modified" };
  }

  // 提取属性
  const title = getPropertyValue(page.properties.Title) as string || "Untitled";
  const excerpt = getPropertyValue(page.properties.Excerpt) as string || "";
  const date = getPropertyValue(page.properties.Date) as Date || new Date();
  
  // 检查状态（只同步已发布的）
  const statusProp = page.properties.Status as { status?: { name: string } } | undefined;
  const status = statusProp?.status?.name;
  
  if (status !== "Published") {
    // 如果文章从已发布变为未发布，删除它
    if (existingArticle) {
      // 删除关联的图片
      const images = await prisma.notionImage.findMany({
        where: { articleId: existingArticle.id },
        select: { fileName: true },
      });
      for (const img of images) {
        await deleteImage(img.fileName);
      }
      await prisma.notionImage.deleteMany({ where: { articleId: existingArticle.id } });
      await prisma.article.delete({ where: { notionPageId: pageId } });
      return { status: "deleted", reason: "Unpublished" };
    }
    return { status: "skipped", reason: "Not published" };
  }

  // 获取封面
  let image = "";
  if (page.cover) {
    const coverUrl = page.cover.type === "file" 
      ? page.cover.file?.url || ""
      : page.cover.external?.url || "";
    if (coverUrl) {
      image = await downloadCoverImage(coverUrl, pageId);
    }
  }
  if (!image) {
    const coverProp = getPropertyValue(page.properties.Cover) as string;
    if (coverProp) {
      image = await downloadCoverImage(coverProp, pageId);
    }
  }
  if (!image) {
    image = `https://picsum.photos/500/400?random=${pageId}`;
  }

  // 获取内容块
  const blocks = await getPageBlocks(pageId);
  const readTime = estimateReadTime(blocks);

  // 先创建/更新文章
  const article = await prisma.article.upsert({
    where: { notionPageId: pageId },
    create: {
      notionPageId: pageId,
      title,
      excerpt,
      content: JSON.stringify(blocks),
      contentType: "notion",
      image,
      date,
      readTime,
      notionLastEditedAt: lastEditedTime,
    },
    update: {
      title,
      excerpt,
      content: JSON.stringify(blocks),
      contentType: "notion",
      image,
      date,
      readTime,
      notionLastEditedAt: lastEditedTime,
    },
  });

  // 同步图片
  const urlMap = await syncArticleImages(article.id, blocks);

  // 替换图片 URL 并更新内容
  if (urlMap.size > 0) {
    const updatedBlocks = replaceImageUrls(blocks as unknown[], urlMap);
    await prisma.article.update({
      where: { id: article.id },
      data: { content: JSON.stringify(updatedBlocks) },
    });
  }

  return { status: "synced", title, imageCount: urlMap.size };
}

async function syncAllPages() {
  if (!NOTION_DATABASE_ID) {
    throw new Error("NOTION_DATABASE_ID is not set");
  }

  ensureImageDir();

  // Notion SDK 5.x 使用 dataSources.query 查询数据库
  const response = await notion.dataSources.query({
    data_source_id: NOTION_DATABASE_ID,
    filter: {
      property: "Status",
      status: {
        equals: "Published",
      },
    },
  });

  const results = [];
  for (const page of response.results) {
    try {
      const result = await syncSinglePage(page.id);
      results.push({ pageId: page.id, ...result });
      // 避免 API 限流
      await new Promise((resolve) => setTimeout(resolve, 350));
    } catch (error) {
      results.push({ 
        pageId: page.id, 
        status: "error", 
        error: String(error) 
      });
    }
  }

  return results;
}

// POST: 触发同步（支持单页或全量）
export async function POST(request: NextRequest) {
  // 验证密钥（可选）
  if (WEBHOOK_SECRET) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${WEBHOOK_SECRET}`) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  try {
    const body = await request.json().catch(() => ({}));
    const { pageId, syncAll } = body as { pageId?: string; syncAll?: boolean };

    if (syncAll || !pageId) {
      // 全量同步
      const results = await syncAllPages();
      return NextResponse.json({
        success: true,
        message: "Full sync completed",
        results,
      });
    } else {
      // 单页同步
      const result = await syncSinglePage(pageId);
      return NextResponse.json({
        success: true,
        message: "Page synced",
        ...result,
      });
    }
  } catch (error) {
    console.error("Webhook sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}

// GET: 检查同步状态 / 手动触发全量同步
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  // 简单的 API key 验证
  if (WEBHOOK_SECRET) {
    const key = searchParams.get("key");
    if (key !== WEBHOOK_SECRET) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }

  if (action === "sync") {
    try {
      const results = await syncAllPages();
      return NextResponse.json({
        success: true,
        message: "Sync completed",
        results,
      });
    } catch (error) {
      return NextResponse.json(
        { error: "Sync failed", details: String(error) },
        { status: 500 }
      );
    }
  }

  // 默认返回状态信息
  const articleCount = await prisma.article.count({
    where: { contentType: "notion" },
  });

  const lastSynced = await prisma.article.findFirst({
    where: { contentType: "notion" },
    orderBy: { updatedAt: "desc" },
    select: { updatedAt: true },
  });

  return NextResponse.json({
    status: "ok",
    notionArticleCount: articleCount,
    lastSyncedAt: lastSynced?.updatedAt || null,
    databaseConfigured: !!NOTION_DATABASE_ID,
  });
}
