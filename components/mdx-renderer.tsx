"use client";

import { useMDXComponent } from "next-mdx-remote/rsc";
import { ReactNode } from "react";

interface MDXComponentProps {
  content: string;
}

// MDX 组件映射
const mdxComponents = {
  h1: (props: any) => (
    <h1 className="text-4xl font-bold my-6 scroll-m-20" {...props} />
  ),
  h2: (props: any) => (
    <h2 className="text-3xl font-semibold my-5 scroll-m-20 border-b pb-2" {...props} />
  ),
  h3: (props: any) => (
    <h3 className="text-2xl font-semibold my-4 scroll-m-20" {...props} />
  ),
  p: (props: any) => (
    <p className="leading-7 my-4 text-base" {...props} />
  ),
  ul: (props: any) => (
    <ul className="my-6 ml-6 list-disc space-y-2" {...props} />
  ),
  ol: (props: any) => (
    <ol className="my-6 ml-6 list-decimal space-y-2" {...props} />
  ),
  li: (props: any) => (
    <li className="text-base" {...props} />
  ),
  code: (props: any) => (
    <code
      className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold"
      {...props}
    />
  ),
  pre: (props: any) => (
    <pre className="mb-4 mt-6 overflow-x-auto rounded-lg border bg-black p-4" {...props} />
  ),
  blockquote: (props: any) => (
    <blockquote className="mt-6 border-l-2 border-primary pl-6 italic text-muted-foreground" {...props} />
  ),
  a: (props: any) => (
    <a className="font-medium text-primary underline underline-offset-4 hover:text-primary/80" {...props} />
  ),
  img: (props: any) => (
    <img className="rounded-lg border my-6" {...props} />
  ),
  table: (props: any) => (
    <div className="my-6 w-full overflow-y-auto">
      <table className="w-full border-collapse border border-border" {...props} />
    </div>
  ),
  th: (props: any) => (
    <th className="border border-border bg-muted px-4 py-2 text-left font-semibold" {...props} />
  ),
  td: (props: any) => (
    <td className="border border-border px-4 py-2" {...props} />
  ),
};

export function MDXRenderer({ content }: MDXComponentProps) {
  // 简单的 Markdown 到 HTML 的转换
  // 由于 @mdx-js/mdx 需要在编译时处理，这里使用一个简化的方法
  // 实际应用中应该在构建时预处理 MDX

  return (
    <div className="prose prose-sm sm:prose-base max-w-none dark:prose-invert">
      <MDXContent content={content} />
    </div>
  );
}

function MDXContent({ content }: { content: string }) {
  // 使用一个简单的 Markdown 渲染器
  // 这里展示基础的格式化
  const lines = content.split("\n");
  const elements: ReactNode[] = [];
  let codeBlock = false;
  let codeContent = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 代码块处理
    if (line.startsWith("```")) {
      if (codeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="mb-4 mt-6 overflow-x-auto rounded-lg border bg-muted p-4">
            <code className="text-sm text-foreground">{codeContent}</code>
          </pre>
        );
        codeContent = "";
        codeBlock = false;
      } else {
        codeBlock = true;
      }
      continue;
    }

    if (codeBlock) {
      codeContent += line + "\n";
      continue;
    }

    // 标题处理
    if (line.startsWith("# ")) {
      elements.push(
        <h1 key={`h1-${i}`} className="text-4xl font-bold my-6 scroll-m-20">
          {line.substring(2)}
        </h1>
      );
    } else if (line.startsWith("## ")) {
      elements.push(
        <h2 key={`h2-${i}`} className="text-3xl font-semibold my-5 scroll-m-20 border-b pb-2">
          {line.substring(3)}
        </h2>
      );
    } else if (line.startsWith("### ")) {
      elements.push(
        <h3 key={`h3-${i}`} className="text-2xl font-semibold my-4 scroll-m-20">
          {line.substring(4)}
        </h3>
      );
    } else if (line.trim() === "") {
      // 空行
      continue;
    } else if (line.startsWith("- ")) {
      elements.push(
        <li key={`li-${i}`} className="text-base ml-6 list-disc">
          {line.substring(2)}
        </li>
      );
    } else if (line.trim()) {
      elements.push(
        <p key={`p-${i}`} className="leading-7 my-4 text-base">
          {line}
        </p>
      );
    }
  }

  return <div className="space-y-4">{elements}</div>;
}
