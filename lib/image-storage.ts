import { createWriteStream, existsSync, mkdirSync } from "fs";
import { unlink } from "fs/promises";
import path from "path";
import crypto from "crypto";
import { Readable } from "stream";
import { finished } from "stream/promises";

// 图片存储目录
const IMAGES_DIR = path.join(process.cwd(), "public", "uploads", "notion");

// 确保目录存在
export function ensureImageDir(): void {
  if (!existsSync(IMAGES_DIR)) {
    mkdirSync(IMAGES_DIR, { recursive: true });
  }
}

// 从 URL 或内容生成唯一文件名
export function generateFileName(blockId: string, mimeType: string): string {
  const ext = getExtensionFromMimeType(mimeType);
  // 使用 blockId 的 hash 作为文件名，确保相同块的图片始终使用相同的文件名
  const hash = crypto.createHash("md5").update(blockId).digest("hex").slice(0, 12);
  return `${hash}${ext}`;
}

// 获取 MIME 类型对应的扩展名
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeToExt: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
    "image/avif": ".avif",
    "image/heic": ".heic",
    "image/heif": ".heif",
  };
  return mimeToExt[mimeType] || ".jpg";
}

// 从 URL 推断 MIME 类型
export function getMimeTypeFromUrl(url: string): string {
  const urlPath = new URL(url).pathname.toLowerCase();
  if (urlPath.endsWith(".png")) return "image/png";
  if (urlPath.endsWith(".gif")) return "image/gif";
  if (urlPath.endsWith(".webp")) return "image/webp";
  if (urlPath.endsWith(".svg")) return "image/svg+xml";
  if (urlPath.endsWith(".avif")) return "image/avif";
  return "image/jpeg"; // 默认
}

export interface DownloadResult {
  success: boolean;
  localPath?: string;
  fileName?: string;
  mimeType?: string;
  size?: number;
  error?: string;
}

/**
 * 下载图片到本地
 */
export async function downloadImage(
  imageUrl: string,
  blockId: string
): Promise<DownloadResult> {
  ensureImageDir();

  try {
    // 下载图片
    const response = await fetch(imageUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; BlogImageSync/1.0)",
      },
    });

    if (!response.ok) {
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // 获取 Content-Type
    const contentType = response.headers.get("content-type") || getMimeTypeFromUrl(imageUrl);
    const mimeType = contentType.split(";")[0].trim();

    // 生成文件名和路径
    const fileName = generateFileName(blockId, mimeType);
    const localPath = path.join(IMAGES_DIR, fileName);
    const relativePath = `/uploads/notion/${fileName}`;

    // 获取图片数据
    const buffer = await response.arrayBuffer();
    const size = buffer.byteLength;

    // 写入文件
    const writeStream = createWriteStream(localPath);
    const readable = Readable.from(Buffer.from(buffer));
    readable.pipe(writeStream);
    await finished(writeStream);

    return {
      success: true,
      localPath: relativePath,
      fileName,
      mimeType,
      size,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 删除本地图片
 */
export async function deleteImage(fileName: string): Promise<boolean> {
  try {
    const filePath = path.join(IMAGES_DIR, fileName);
    if (existsSync(filePath)) {
      await unlink(filePath);
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * 从 Notion blocks 中提取所有图片信息
 */
export interface NotionImageInfo {
  blockId: string;
  url: string;
  type: "file" | "external";
  caption?: string;
}

export function extractImagesFromBlocks(blocks: unknown[]): NotionImageInfo[] {
  const images: NotionImageInfo[] = [];

  function traverse(items: unknown[]): void {
    for (const item of items) {
      const block = item as Record<string, unknown>;
      
      if (block.type === "image") {
        const imageContent = block.image as {
          type: "file" | "external";
          file?: { url: string };
          external?: { url: string };
          caption?: Array<{ plain_text: string }>;
        };

        if (imageContent) {
          const url = imageContent.type === "file"
            ? imageContent.file?.url
            : imageContent.external?.url;

          if (url) {
            images.push({
              blockId: block.id as string,
              url,
              type: imageContent.type,
              caption: imageContent.caption?.map(c => c.plain_text).join("") || undefined,
            });
          }
        }
      }

      // 递归处理子块
      const children = block.children as unknown[] | undefined;
      if (children && Array.isArray(children)) {
        traverse(children);
      }
    }
  }

  traverse(blocks);
  return images;
}

/**
 * 将 blocks 中的图片 URL 替换为本地路径
 */
export function replaceImageUrls(
  blocks: unknown[],
  urlMap: Map<string, string> // blockId -> localPath
): unknown[] {
  function traverse(items: unknown[]): unknown[] {
    return items.map((item) => {
      const block = { ...(item as Record<string, unknown>) };

      if (block.type === "image") {
        const imageContent = { ...(block.image as Record<string, unknown>) };
        const blockId = block.id as string;
        const localPath = urlMap.get(blockId);

        if (localPath) {
          // 替换为本地路径，统一使用 external 类型
          imageContent.type = "external";
          imageContent.external = { url: localPath };
          delete imageContent.file;
          block.image = imageContent;
        }
      }

      // 递归处理子块
      const children = block.children as unknown[] | undefined;
      if (children && Array.isArray(children)) {
        block.children = traverse(children);
      }

      return block;
    });
  }

  return traverse(blocks);
}
