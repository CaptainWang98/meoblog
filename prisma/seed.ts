import { PrismaClient } from "../lib/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

// 获取 __dirname（ESM 兼容）
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 创建适配器 - 注意: Prisma 7 使用新的配置方式
const adapter = new PrismaBetterSqlite3({
  url: path.join(__dirname, "dev.db"),
});

const prisma = new PrismaClient({
  adapter,
});

const articles = [
  {
    title: "React 18 新特性深度解析",
    excerpt: "探索 React 18 的新特性，包括并发渲染、自动批处理等核心改进。",
    content: `# React 18 新特性深度解析

React 18 带来了许多激动人心的新特性，让我们一起探索它们。

## 并发渲染 (Concurrent Rendering)

并发渲染是 React 18 最核心的特性。它使 React 能够中断长时间的渲染任务，优先处理更高优先级的更新。

\`\`\`javascript
import { startTransition } from 'react';

function handleClick() {
  startTransition(() => {
    // 低优先级的状态更新
    setSearchResults(results);
  });
}
\`\`\`

## 自动批处理 (Automatic Batching)

React 18 现在会自动批处理所有的状态更新，即使这些更新来自异步操作。

## 新的 Suspense 特性

Suspense 现在支持更多的功能，包括服务端渲染和流式传输。

总之，React 18 为我们提供了更强大的性能优化工具。`,
    image: "https://picsum.photos/500/400?random=1",
    readTime: 8,
  },
  {
    title: "Next.js 优化最佳实践",
    excerpt: "学习如何优化 Next.js 应用的性能，包括图片优化、代码分割等技巧。",
    content: `# Next.js 优化最佳实践

构建高性能的 Next.js 应用需要遵循一些最佳实践。

## 图片优化

使用 Next.js 的 Image 组件可以自动优化图片：

\`\`\`jsx
import Image from 'next/image';

export default function Hero() {
  return (
    <Image
      src="/hero.png"
      alt="Hero image"
      width={1200}
      height={600}
      priority
    />
  );
}
\`\`\`

## 代码分割

Next.js 会自动为每个页面进行代码分割，确保用户只下载他们需要的代码。

## 静态生成 (SSG)

使用 \`getStaticProps\` 和 \`getStaticPaths\` 来静态生成页面，提高性能。`,
    image: "https://picsum.photos/500/400?random=2",
    readTime: 7,
  },
  {
    title: "TypeScript 高级类型系统",
    excerpt: "深入理解 TypeScript 的类型系统，掌握高级用法和最佳实践。",
    content: `# TypeScript 高级类型系统

TypeScript 的类型系统非常强大，让我们深入探索高级用法。

## 条件类型 (Conditional Types)

\`\`\`typescript
type IsString<T> = T extends string ? true : false;

type A = IsString<"hello">; // true
type B = IsString<123>; // false
\`\`\`

## 映射类型 (Mapped Types)

映射类型允许你根据现有类型创建新类型。

\`\`\`typescript
type Readonly<T> = {
  readonly [K in keyof T]: T[K];
};
\`\`\`

## 类型推断 (Type Inference)

TypeScript 可以根据代码自动推断类型，减少你需要显式注解的类型。`,
    image: "https://picsum.photos/500/400?random=3",
    readTime: 10,
  },
  {
    title: "Tailwind CSS 深度教程",
    excerpt: "Tailwind CSS 从入门到精通，让你快速构建现代化的用户界面。",
    content: `# Tailwind CSS 深度教程

Tailwind CSS 是一个功能优先的 CSS 框架，让我们学习如何充分利用它。

## 响应式设计

\`\`\`html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- 在不同屏幕尺寸下响应式变化 -->
</div>
\`\`\`

## 自定义配置

在 tailwind.config.js 中自定义主题。

## 使用插件扩展功能

Tailwind 生态系统提供了许多有用的插件。`,
    image: "https://picsum.photos/500/400?random=4",
    readTime: 6,
  },
  {
    title: "Web 性能优化指南",
    excerpt: "系统学习 Web 性能优化，提升用户体验和应用加载速度。",
    content: `# Web 性能优化指南

优化 Web 应用的性能对用户体验至关重要。

## Core Web Vitals

关注三个关键指标：
- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)

## 缓存策略

实施适当的缓存策略可以显著提高性能。

## 最小化资源大小

- 压缩代码和资源
- 使用现代格式（WebP、AVIF）
- 实施代码分割`,
    image: "https://picsum.photos/500/400?random=5",
    readTime: 9,
  },
  {
    title: "前端工程化的未来",
    excerpt: "探讨前端工程化的发展方向，了解最新的工具和最佳实践。",
    content: `# 前端工程化的未来

前端工程化正在快速演进，让我们探索最新的趋势。

## Monorepo 架构

使用 monorepo 管理多个相关的项目。

## 自动化测试

建立完善的测试体系：
- 单元测试
- 集成测试
- E2E 测试

## CI/CD 流程

自动化开发工作流提高效率和质量。`,
    image: "https://picsum.photos/500/400?random=6",
    readTime: 8,
  },
];

async function main() {
  console.log("开始数据库种子填充...");

  // 清空现有数据
  await prisma.article.deleteMany({});
  console.log("已清空现有文章");

  // 插入新数据
  for (const article of articles) {
    const created = await prisma.article.create({
      data: {
        ...article,
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // 随机日期
      },
    });
    console.log(`已创建文章: ${created.title}`);
  }

  console.log("数据库种子填充完成！");
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
