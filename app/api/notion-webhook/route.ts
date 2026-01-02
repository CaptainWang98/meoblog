import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { notion, NOTION_DATABASE_ID, getPropertyValue, estimateReadTime, NotionBlock } from "@/lib/notion";
import { 
  downloadImage, 
  extractImagesFromBlocks, 
  replaceImageUrls,
  ensureImageDir,
  deleteImage 
} from "@/lib/image-storage";
import { prisma } from "@/lib/prisma";

// Notion Webhook verification token（从 Notion Integration 设置中获取）
const NOTION_VERIFICATION_TOKEN = process.env.NOTION_VERIFICATION_TOKEN;
// 手动触发时使用的密钥（可选）
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

  // 获取封面（从页面自带的 cover 获取）
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

/**
 * 验证 Notion Webhook 签名
 */
function verifyNotionSignature(body: string, signature: string | null): boolean {
  if (!NOTION_VERIFICATION_TOKEN || !signature) {
    return false;
  }

  const expectedSignature = `sha256=${createHmac("sha256", NOTION_VERIFICATION_TOKEN)
    .update(body)
    .digest("hex")}`;

  try {
    return timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

// Notion Webhook 事件类型
interface NotionWebhookEvent {
  type: string;
  verification_token?: string; // 首次验证时的 token
  entity?: {
    id: string;
    type: string;
  };
  data?: Record<string, unknown>;
  timestamp?: string;
}

// POST: 接收 Notion Webhook 事件 或 手动触发同步
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let body: NotionWebhookEvent & { pageId?: string; syncAll?: boolean };
  
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 1. 处理 Notion Webhook 验证请求（首次设置时）
  if (body.verification_token) {
    console.log("🔐 Notion Webhook 验证请求，verification_token:", body.verification_token);
    // 返回成功，让你可以在 Notion Integration 设置中输入这个 token
    return NextResponse.json({ 
      success: true, 
      message: "Verification token received. Please save it to NOTION_VERIFICATION_TOKEN env var.",
      verification_token: body.verification_token 
    });
  }

  // 2. 验证 Notion Webhook 签名（如果已配置）
  const notionSignature = request.headers.get("x-notion-signature");
  if (notionSignature && NOTION_VERIFICATION_TOKEN) {
    if (!verifyNotionSignature(rawBody, notionSignature)) {
      console.error("❌ Notion Webhook 签名验证失败");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    console.log("✅ Notion Webhook 签名验证成功");
  }

  // 3. 处理 Notion Webhook 事件
  if (body.type && body.entity) {
    console.log(`📨 收到 Notion 事件: ${body.type}, entity: ${body.entity.type} ${body.entity.id}`);
    
    // 只处理页面内容更新事件
    if (body.type === "page.content_updated" || body.type === "page.properties_updated") {
      try {
        const result = await syncSinglePage(body.entity.id);
        return NextResponse.json({
          success: true,
          message: "Page synced from webhook",
          ...result,
        });
      } catch (error) {
        console.error("Webhook sync error:", error);
        return NextResponse.json(
          { error: "Sync failed", details: String(error) },
          { status: 500 }
        );
      }
    }

    // 其他事件类型，直接返回成功
    return NextResponse.json({ success: true, message: `Event ${body.type} acknowledged` });
  }

  // 4. 手动触发同步（使用 WEBHOOK_SECRET 验证）
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
