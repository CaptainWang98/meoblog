import { Client } from "@notionhq/client";

// 确保在使用前设置环境变量
// NOTION_API_KEY: Notion Integration Token
// NOTION_DATABASE_ID: Notion 文章数据库 ID

if (!process.env.NOTION_API_KEY) {
  console.warn("Warning: NOTION_API_KEY is not set");
}

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

export const NOTION_DATABASE_ID = process.env.NOTION_DATABASE_ID || "";

// Notion Block 类型定义
export type NotionBlock = {
  id: string;
  type: string;
  [key: string]: unknown;
};

export type NotionRichText = {
  type: "text" | "mention" | "equation";
  text?: {
    content: string;
    link: { url: string } | null;
  };
  annotations: {
    bold: boolean;
    italic: boolean;
    strikethrough: boolean;
    underline: boolean;
    code: boolean;
    color: string;
  };
  plain_text: string;
  href: string | null;
};

// 从 Notion 数据库属性中提取值的辅助函数
export function getPropertyValue(property: unknown): string | Date | null {
  if (!property || typeof property !== "object") return null;
  
  const prop = property as Record<string, unknown>;
  
  switch (prop.type) {
    case "title":
      return (prop.title as NotionRichText[])?.map(t => t.plain_text).join("") || "";
    case "rich_text":
      return (prop.rich_text as NotionRichText[])?.map(t => t.plain_text).join("") || "";
    case "date":
      return (prop.date as { start: string })?.start ? new Date((prop.date as { start: string }).start) : null;
    case "number":
      return String(prop.number ?? "");
    case "url":
      return (prop.url as string) || "";
    case "files":
      const files = prop.files as Array<{ type: string; file?: { url: string }; external?: { url: string } }>;
      if (files && files.length > 0) {
        const file = files[0];
        return file.type === "file" ? file.file?.url || "" : file.external?.url || "";
      }
      return "";
    case "last_edited_time":
      return new Date(prop.last_edited_time as string);
    default:
      return null;
  }
}

// 估算阅读时间（基于内容块数量）
export function estimateReadTime(blocks: NotionBlock[]): number {
  let wordCount = 0;
  
  for (const block of blocks) {
    const blockType = block.type;
    const blockContent = block[blockType] as Record<string, unknown> | undefined;
    
    if (blockContent?.rich_text) {
      const richText = blockContent.rich_text as NotionRichText[];
      wordCount += richText.reduce((acc, t) => acc + t.plain_text.length, 0);
    }
  }
  
  // 假设中文每分钟阅读 400 字
  return Math.max(1, Math.ceil(wordCount / 400));
}
