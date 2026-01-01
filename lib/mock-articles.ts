export interface Article {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  readTime: number;
  content: string; // MDX content
}

// MDX 内容模板
const mdxContents = [
  `# React 18 新特性深度解析

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

  `# Next.js 优化最佳实践

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

  `# TypeScript 高级类型系统

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

  `# Tailwind CSS 深度教程

Tailwind CSS 是一个功能优先的 CSS 框架，让我们学习如何充分利用它。

## 响应式设计

\`\`\`html
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <!-- 在不同屏幕尺寸下响应式变化 -->
</div>
\`\`\`

## 自定义配置

在 tailwind.config.js 中自定义主题：

\`\`\`javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: '#007bff',
      },
    },
  },
};
\`\`\`

## 使用插件扩展功能

Tailwind 生态系统提供了许多有用的插件。`,

  `# Web 性能优化指南

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

  `# 前端工程化的未来

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

  `# 现代 JavaScript 异步编程

异步编程是现代 JavaScript 开发的核心。

## Promise 基础

\`\`\`javascript
const promise = new Promise((resolve, reject) => {
  // 异步操作
});
\`\`\`

## Async/Await 语法

\`\`\`javascript
async function fetchData() {
  try {
    const data = await fetch('/api/data');
    return data.json();
  } catch (error) {
    console.error(error);
  }
}
\`\`\`

## 错误处理

正确处理异步操作中的错误对应用的稳定性很重要。`,

  `# CSS Grid 布局完全指南

CSS Grid 提供了强大的二维布局能力。

## 基础概念

Grid 由行和列组成，可以精确控制元素位置。

\`\`\`css
.container {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
}
\`\`\`

## 高级应用

使用 Grid 创建复杂的响应式布局。`,

  `# 如何构建可扩展的组件库

构建一个好的组件库需要考虑许多方面。

## 组件设计原则

- 单一职责
- 可组合性
- 灵活性

## 文档和示例

提供完善的文档和示例代码。

## 版本管理

使用语义化版本控制管理组件库的发布。`,

  `# 函数式编程在前端的应用

函数式编程的思想在前端开发中越来越重要。

## 纯函数

\`\`\`javascript
// 纯函数
const add = (a, b) => a + b;

// 非纯函数
let total = 0;
const addToTotal = (n) => total += n;
\`\`\`

## 高阶函数

\`\`\`javascript
const withLogging = (fn) => (...args) => {
  console.log(args);
  return fn(...args);
};
\`\`\`

## 函数组合

组合多个小的纯函数来构建复杂功能。`,

  `# Webpack 5 打包优化

Webpack 5 带来了许多性能改进。

## 模块联邦 (Module Federation)

在运行时动态加载其他应用的模块。

## 缓存优化

Webpack 5 改进了缓存机制，加快构建速度。

## Tree Shaking

移除未使用的代码，减小打包体积。`,

  `# GraphQL 实战指南

GraphQL 提供了强大的数据查询语言。

## 基本概念

\`\`\`graphql
query {
  user(id: "123") {
    name
    email
    posts {
      title
      content
    }
  }
}
\`\`\`

## 服务端实现

使用 Apollo Server 或其他库实现 GraphQL 服务。

## 客户端集成

使用 Apollo Client 与 GraphQL 服务通信。`,
];

// 生成随机的测试文章数据
const articleTitles = [
  "React 18 新特性深度解析",
  "Next.js 优化最佳实践",
  "TypeScript 高级类型系统",
  "Tailwind CSS 深度教程",
  "Web 性能优化指南",
  "前端工程化的未来",
  "现代 JavaScript 异步编程",
  "CSS Grid 布局完全指南",
  "如何构建可扩展的组件库",
  "函数式编程在前端的应用",
  "Webpack 5 打包优化",
  "GraphQL 实战指南",
];

const excerpts = [
  "探索 React 18 的新特性，包括并发渲染、自动批处理等核心改进。",
  "学习如何优化 Next.js 应用的性能，包括图片优化、代码分割等技巧。",
  "深入理解 TypeScript 的类型系统，掌握高级用法和最佳实践。",
  "Tailwind CSS 从入门到精通，让你快速构建现代化的用户界面。",
  "系统学习 Web 性能优化，提升用户体验和应用加载速度。",
  "探讨前端工程化的发展方向，了解最新的工具和最佳实践。",
  "掌握现代 JavaScript 的异步编程方式，Promise、async/await 等。",
  "完整学习 CSS Grid 布局系统，创建灵活的响应式设计。",
  "构建可复用、可维护的组件库的完整指南和实战经验。",
  "函数式编程思想在前端开发中的实际应用和优势分析。",
  "深入了解 Webpack 5 的新特性和打包优化策略。",
  "GraphQL 在现代应用中的实战应用，API 设计新思路。",
];

const imageUrls = [
  "https://picsum.photos/500/400?random=1",
  "https://picsum.photos/500/400?random=2",
  "https://picsum.photos/500/400?random=3",
  "https://picsum.photos/500/400?random=4",
  "https://picsum.photos/500/400?random=5",
  "https://picsum.photos/500/400?random=6",
  "https://picsum.photos/500/400?random=7",
  "https://picsum.photos/500/400?random=8",
  "https://picsum.photos/500/400?random=9",
  "https://picsum.photos/500/400?random=10",
  "https://picsum.photos/500/400?random=11",
  "https://picsum.photos/500/400?random=12",
];

function generateArticle(id: number): Article {
  const titleIndex = (id - 1) % articleTitles.length;
  const imageIndex = (id - 1) % imageUrls.length;

  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * 30));
  const formattedDate = date.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return {
    id,
    title: `${articleTitles[titleIndex]} #${id}`,
    excerpt: excerpts[titleIndex],
    image: imageUrls[imageIndex],
    date: formattedDate,
    readTime: Math.floor(Math.random() * 15) + 3,
    content: mdxContents[titleIndex],
  };
}

export function generateArticles(page: number, pageSize: number = 12): Article[] {
  const start = (page - 1) * pageSize;
  const articles: Article[] = [];

  for (let i = 0; i < pageSize; i++) {
    articles.push(generateArticle(start + i + 1));
  }

  return articles;
}
