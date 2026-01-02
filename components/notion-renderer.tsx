"use client";

import { cn } from "@/lib/utils";
import { NotionRichText, NotionBlock } from "@/lib/notion";

// 渲染富文本
function RichText({ richText }: { richText: NotionRichText[] }) {
  if (!richText || richText.length === 0) return null;

  return (
    <>
      {richText.map((text, index) => {
        const { annotations, plain_text, href } = text;
        
        let content: React.ReactNode = plain_text;
        
        // 应用注解样式
        if (annotations.code) {
          content = (
            <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-sm">
              {content}
            </code>
          );
        }
        if (annotations.bold) {
          content = <strong>{content}</strong>;
        }
        if (annotations.italic) {
          content = <em>{content}</em>;
        }
        if (annotations.strikethrough) {
          content = <s>{content}</s>;
        }
        if (annotations.underline) {
          content = <u>{content}</u>;
        }
        
        // 处理链接
        if (href) {
          content = (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-4 hover:text-primary/80"
            >
              {content}
            </a>
          );
        }
        
        // 处理颜色
        if (annotations.color && annotations.color !== "default") {
          const colorClasses: Record<string, string> = {
            gray: "text-gray-500",
            brown: "text-amber-700",
            orange: "text-orange-500",
            yellow: "text-yellow-500",
            green: "text-green-500",
            blue: "text-blue-500",
            purple: "text-purple-500",
            pink: "text-pink-500",
            red: "text-red-500",
            gray_background: "bg-gray-100 dark:bg-gray-800",
            brown_background: "bg-amber-100 dark:bg-amber-900",
            orange_background: "bg-orange-100 dark:bg-orange-900",
            yellow_background: "bg-yellow-100 dark:bg-yellow-900",
            green_background: "bg-green-100 dark:bg-green-900",
            blue_background: "bg-blue-100 dark:bg-blue-900",
            purple_background: "bg-purple-100 dark:bg-purple-900",
            pink_background: "bg-pink-100 dark:bg-pink-900",
            red_background: "bg-red-100 dark:bg-red-900",
          };
          const colorClass = colorClasses[annotations.color];
          if (colorClass) {
            content = <span className={colorClass}>{content}</span>;
          }
        }
        
        return <span key={index}>{content}</span>;
      })}
    </>
  );
}

// 获取块内容
function getBlockContent(block: NotionBlock): Record<string, unknown> | undefined {
  return block[block.type] as Record<string, unknown> | undefined;
}

// 获取富文本数组
function getRichText(block: NotionBlock): NotionRichText[] {
  const content = getBlockContent(block);
  return (content?.rich_text as NotionRichText[]) || [];
}

// 单个块渲染器
function NotionBlockRenderer({ 
  block, 
}: { 
  block: NotionBlock; 
  index: number;
}) {
  const content = getBlockContent(block);
  const children = (block as Record<string, unknown>).children as NotionBlock[] | undefined;

  switch (block.type) {
    case "paragraph":
      return (
        <p className="leading-7 mb-4">
          <RichText richText={getRichText(block)} />
        </p>
      );

    case "heading_1":
      return (
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl mt-8 mb-4">
          <RichText richText={getRichText(block)} />
        </h1>
      );

    case "heading_2":
      return (
        <h2 className="scroll-m-20 border-b pb-2 text-3xl font-semibold tracking-tight mt-8 mb-4">
          <RichText richText={getRichText(block)} />
        </h2>
      );

    case "heading_3":
      return (
        <h3 className="scroll-m-20 text-2xl font-semibold tracking-tight mt-6 mb-3">
          <RichText richText={getRichText(block)} />
        </h3>
      );

    case "bulleted_list_item":
      return (
        <li className="mb-2">
          <RichText richText={getRichText(block)} />
          {children && children.length > 0 && (
            <ul className="list-disc list-inside ml-4 mt-2">
              {children.map((child, i) => (
                <NotionBlockRenderer key={child.id} block={child} index={i} />
              ))}
            </ul>
          )}
        </li>
      );

    case "numbered_list_item":
      return (
        <li className="mb-2">
          <RichText richText={getRichText(block)} />
          {children && children.length > 0 && (
            <ol className="list-decimal list-inside ml-4 mt-2">
              {children.map((child, i) => (
                <NotionBlockRenderer key={child.id} block={child} index={i} />
              ))}
            </ol>
          )}
        </li>
      );

    case "to_do":
      const checked = content?.checked as boolean;
      return (
        <div className="flex items-start gap-2 mb-2">
          <input 
            type="checkbox" 
            checked={checked} 
            readOnly 
            className="mt-1.5"
          />
          <span className={cn(checked && "line-through text-muted-foreground")}>
            <RichText richText={getRichText(block)} />
          </span>
        </div>
      );

    case "toggle":
      return (
        <details className="mb-4">
          <summary className="cursor-pointer font-medium">
            <RichText richText={getRichText(block)} />
          </summary>
          {children && children.length > 0 && (
            <div className="ml-4 mt-2">
              {children.map((child, i) => (
                <NotionBlockRenderer key={child.id} block={child} index={i} />
              ))}
            </div>
          )}
        </details>
      );

    case "code":
      const language = content?.language as string || "plain text";
      const codeText = getRichText(block).map(t => t.plain_text).join("");
      return (
        <div className="mb-4">
          <div className="bg-muted/50 px-4 py-1 text-sm text-muted-foreground rounded-t-lg border border-b-0">
            {language}
          </div>
          <pre className="bg-muted p-4 rounded-b-lg overflow-x-auto border">
            <code className="text-sm font-mono">{codeText}</code>
          </pre>
        </div>
      );

    case "quote":
      return (
        <blockquote className="border-l-4 border-primary pl-4 italic my-4">
          <RichText richText={getRichText(block)} />
        </blockquote>
      );

    case "callout":
      const icon = content?.icon as { type: string; emoji?: string } | undefined;
      const emoji = icon?.type === "emoji" ? icon.emoji : "💡";
      return (
        <div className="flex gap-3 p-4 bg-muted/50 rounded-lg my-4 border">
          <span className="text-xl">{emoji}</span>
          <div className="flex-1">
            <RichText richText={getRichText(block)} />
          </div>
        </div>
      );

    case "divider":
      return <hr className="my-8 border-t" />;

    case "image":
      const imageData = content as { 
        type: string; 
        file?: { url: string }; 
        external?: { url: string };
        caption?: NotionRichText[];
      };
      const imageUrl = imageData.type === "file" 
        ? imageData.file?.url 
        : imageData.external?.url;
      const caption = imageData.caption;
      
      if (!imageUrl) return null;

      // 如果是本地路径（以 /uploads 开头），直接使用
      // 否则说明图片下载失败，使用原始 URL
      const finalImageUrl = imageUrl.startsWith("/uploads") 
        ? imageUrl 
        : imageUrl;
      
      return (
        <figure className="my-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={finalImageUrl}
            alt={caption?.map(c => c.plain_text).join("") || "Image"}
            className="rounded-lg max-w-full h-auto mx-auto"
            loading="lazy"
          />
          {caption && caption.length > 0 && (
            <figcaption className="text-center text-sm text-muted-foreground mt-2">
              <RichText richText={caption} />
            </figcaption>
          )}
        </figure>
      );

    case "video":
      const videoData = content as { 
        type: string; 
        file?: { url: string }; 
        external?: { url: string };
      };
      const videoUrl = videoData.type === "file" 
        ? videoData.file?.url 
        : videoData.external?.url;
      
      if (!videoUrl) return null;
      
      // 检查是否是 YouTube 链接
      const youtubeMatch = videoUrl.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
      if (youtubeMatch) {
        return (
          <div className="my-6 aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeMatch[1]}`}
              className="w-full h-full rounded-lg"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        );
      }
      
      return (
        <video 
          src={videoUrl} 
          controls 
          className="my-6 rounded-lg max-w-full"
        />
      );

    case "embed":
    case "bookmark":
      const url = content?.url as string;
      if (!url) return null;
      
      return (
        <a 
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block my-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
        >
          <span className="text-primary underline break-all">{url}</span>
        </a>
      );

    case "table":
      const hasColumnHeader = content?.has_column_header as boolean;
      const hasRowHeader = content?.has_row_header as boolean;
      
      if (!children || children.length === 0) return null;
      
      return (
        <div className="my-6 overflow-x-auto">
          <table className="w-full border-collapse border">
            <tbody>
              {children.map((row, rowIndex) => {
                const rowContent = getBlockContent(row);
                const cells = rowContent?.cells as NotionRichText[][];
                
                if (!cells) return null;
                
                return (
                  <tr key={row.id}>
                    {cells.map((cell, cellIndex) => {
                      const isHeader = 
                        (hasColumnHeader && rowIndex === 0) || 
                        (hasRowHeader && cellIndex === 0);
                      const Tag = isHeader ? "th" : "td";
                      
                      return (
                        <Tag 
                          key={cellIndex}
                          className={cn(
                            "border p-2",
                            isHeader && "bg-muted font-semibold"
                          )}
                        >
                          <RichText richText={cell} />
                        </Tag>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );

    case "table_row":
      // 在 table 渲染器中处理
      return null;

    case "column_list":
      if (!children || children.length === 0) return null;
      
      return (
        <div className="flex gap-4 my-4">
          {children.map((column, i) => (
            <NotionBlockRenderer key={column.id} block={column} index={i} />
          ))}
        </div>
      );

    case "column":
      if (!children || children.length === 0) return null;
      
      return (
        <div className="flex-1">
          {children.map((child, i) => (
            <NotionBlockRenderer key={child.id} block={child} index={i} />
          ))}
        </div>
      );

    case "equation":
      const expression = content?.expression as string;
      return (
        <div className="my-4 text-center font-mono bg-muted p-4 rounded-lg overflow-x-auto">
          {expression}
        </div>
      );

    case "synced_block":
      if (!children || children.length === 0) return null;
      
      return (
        <>
          {children.map((child, i) => (
            <NotionBlockRenderer key={child.id} block={child} index={i} />
          ))}
        </>
      );

    default:
      // 对于未知类型，尝试渲染富文本
      const richText = getRichText(block);
      if (richText.length > 0) {
        return (
          <p className="leading-7 mb-4">
            <RichText richText={richText} />
          </p>
        );
      }
      return null;
  }
}

// 处理列表项分组
function groupListItems(blocks: NotionBlock[]): (NotionBlock | NotionBlock[])[] {
  const grouped: (NotionBlock | NotionBlock[])[] = [];
  let currentList: NotionBlock[] = [];
  let currentListType: string | null = null;

  for (const block of blocks) {
    if (block.type === "bulleted_list_item" || block.type === "numbered_list_item") {
      if (currentListType === block.type) {
        currentList.push(block);
      } else {
        if (currentList.length > 0) {
          grouped.push(currentList);
        }
        currentList = [block];
        currentListType = block.type;
      }
    } else {
      if (currentList.length > 0) {
        grouped.push(currentList);
        currentList = [];
        currentListType = null;
      }
      grouped.push(block);
    }
  }

  if (currentList.length > 0) {
    grouped.push(currentList);
  }

  return grouped;
}

// 主渲染器
export function NotionRenderer({ blocks }: { blocks: NotionBlock[] }) {
  const groupedBlocks = groupListItems(blocks);

  return (
    <div className="notion-content prose prose-neutral dark:prose-invert max-w-none">
      {groupedBlocks.map((item, index) => {
        // 如果是列表项数组
        if (Array.isArray(item)) {
          const listType = item[0].type;
          const ListTag = listType === "numbered_list_item" ? "ol" : "ul";
          const listClass = listType === "numbered_list_item" 
            ? "list-decimal" 
            : "list-disc";
          
          return (
            <ListTag key={index} className={cn(listClass, "list-inside mb-4 ml-4")}>
              {item.map((block, i) => (
                <NotionBlockRenderer key={block.id} block={block} index={i} />
              ))}
            </ListTag>
          );
        }
        
        // 单个块
        return (
          <NotionBlockRenderer 
            key={item.id} 
            block={item} 
            index={index} 
          />
        );
      })}
    </div>
  );
}
