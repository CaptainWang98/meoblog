import { notion, NOTION_DATABASE_ID, getPropertyValue, estimateReadTime, NotionBlock } from "../lib/notion";
import { 
  downloadImage, 
  extractImagesFromBlocks, 
  replaceImageUrls,
  ensureImageDir,
  deleteImage 
} from "../lib/image-storage";
import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const adapter = new PrismaBetterSqlite3({
  url: path.join(__dirname, "../prisma/dev.db"),
});

const prisma = new PrismaClient({ adapter });

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

async function getNotionPages(): Promise<NotionPage[]> {
  if (!NOTION_DATABASE_ID) {
    throw new Error("NOTION_DATABASE_ID is not set");
  }

  const response = await notion.dataSources.query({
    data_source_id: NOTION_DATABASE_ID,
    filter: {
      property: "Status",
      status: {
        equals: "Published",
      },
    },
    sorts: [
      {
        property: "Date",
        direction: "descending",
      },
    ],
  });

  return response.results as unknown as NotionPage[];
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
  const urlMap = new Map<string, string>(); // blockId -> localPath
  const images = extractImagesFromBlocks(blocks as unknown[]);

  if (images.length === 0) {
    return urlMap;
  }

  console.log(`  🖼️  发现 ${images.length} 张图片，开始下载...`);

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
      console.log(`  🗑️  删除旧图片: ${existing.fileName}`);
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

    // 如果已存在且是最近同步的，跳过下载
    if (existing) {
      urlMap.set(image.blockId, existing.localPath);
      // 更新 Notion URL（因为会过期）
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

      // 保存到数据库
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

      console.log(`  ✅ 下载成功: ${result.fileName}`);
    } else {
      console.log(`  ⚠️  下载失败: ${result.error}`);
      // 失败时保留原 URL
      urlMap.set(image.blockId, image.url);
    }

    // 避免请求过快
    await new Promise((resolve) => setTimeout(resolve, 200));
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
  // 如果是外部链接，直接使用
  if (!coverUrl.includes("notion") && !coverUrl.includes("amazonaws")) {
    return coverUrl;
  }

  const blockId = `cover-${notionPageId}`;
  const result = await downloadImage(coverUrl, blockId);

  if (result.success && result.localPath) {
    console.log(`  ✅ 封面下载成功: ${result.fileName}`);
    return result.localPath;
  }

  console.log(`  ⚠️  封面下载失败，使用原 URL`);
  return coverUrl;
}

async function syncNotionArticles() {
  console.log("🔄 开始同步 Notion 文章...\n");
  ensureImageDir();

  try {
    const pages = await getNotionPages();
    console.log(`📚 找到 ${pages.length} 篇已发布的文章\n`);

    let syncedCount = 0;
    let skippedCount = 0;
    let imageCount = 0;

    for (const page of pages) {
      const notionPageId = page.id;
      const lastEditedTime = new Date(page.last_edited_time);

      // 检查是否需要更新
      const existingArticle = await prisma.article.findUnique({
        where: { notionPageId },
        select: { id: true, notionLastEditedAt: true },
      });

      if (
        existingArticle?.notionLastEditedAt &&
        existingArticle.notionLastEditedAt >= lastEditedTime
      ) {
        console.log(`⏭️  跳过 (未修改): ${getPropertyValue(page.properties.Title)}`);
        skippedCount++;
        continue;
      }

      // 获取页面属性
      const title = getPropertyValue(page.properties.Title) as string || "Untitled";
      const excerpt = getPropertyValue(page.properties.Excerpt) as string || "";
      const date = getPropertyValue(page.properties.Date) as Date || new Date();
      
      console.log(`📖 同步文章: ${title}`);

      // 获取封面（从页面自带的 cover 获取）
      let image = "";
      if (page.cover) {
        const coverUrl = page.cover.type === "file" 
          ? page.cover.file?.url || ""
          : page.cover.external?.url || "";
        if (coverUrl) {
          image = await downloadCoverImage(coverUrl, notionPageId);
        }
      }
      if (!image) {
        image = `https://picsum.photos/500/400?random=${notionPageId}`;
      }

      // 获取页面内容块
      const blocks = await getPageBlocks(notionPageId);
      const readTime = estimateReadTime(blocks);

      // 先创建/更新文章（不包含图片替换后的内容）
      const article = await prisma.article.upsert({
        where: { notionPageId },
        create: {
          notionPageId,
          title,
          excerpt,
          content: JSON.stringify(blocks), // 临时存储
          contentType: "notion",
          image,
          date,
          readTime,
          notionLastEditedAt: lastEditedTime,
        },
        update: {
          title,
          excerpt,
          content: JSON.stringify(blocks), // 临时存储
          contentType: "notion",
          image,
          date,
          readTime,
          notionLastEditedAt: lastEditedTime,
        },
      });

      // 同步图片并获取映射
      const urlMap = await syncArticleImages(article.id, blocks);
      imageCount += urlMap.size;

      // 替换图片 URL 并更新内容
      if (urlMap.size > 0) {
        const updatedBlocks = replaceImageUrls(blocks as unknown[], urlMap);
        await prisma.article.update({
          where: { id: article.id },
          data: { content: JSON.stringify(updatedBlocks) },
        });
      }

      console.log(`✅ 已同步: ${title}\n`);
      syncedCount++;

      // 避免 API 限流
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    console.log(`\n🎉 同步完成！`);
    console.log(`   文章: ${syncedCount} 篇已同步, ${skippedCount} 篇已跳过`);
    console.log(`   图片: ${imageCount} 张已处理`);

  } catch (error) {
    console.error("❌ 同步失败:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// 运行同步
syncNotionArticles();
