import { Article } from "@/components/article-card";

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
