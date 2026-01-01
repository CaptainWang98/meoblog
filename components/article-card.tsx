import Image from "next/image";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface Article {
  id: number;
  title: string;
  excerpt: string;
  image: string;
  date: string;
  readTime: number;
  content?: string;
}

interface ArticleCardProps {
  article: Article;
}

export function ArticleCard({ article }: ArticleCardProps) {
  return (
    <Link href={`/articles/${article.id}`}>
      <article className="group relative bg-card rounded-lg overflow-hidden border border-border transition-all duration-300 hover:shadow-lg hover:border-primary/50 cursor-pointer h-full flex flex-col">
        {/* Image Container */}
        <div className="relative w-full h-48 overflow-hidden bg-muted">
          <Image
            src={article.image}
            alt={article.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            unoptimized
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        </div>

        {/* Content Container */}
        <div className="flex-1 p-4 flex flex-col justify-between">
          {/* Title */}
          <div className="space-y-2 flex-1">
            <h3 className="text-lg font-semibold line-clamp-2 group-hover:text-primary transition-colors">
              {article.title}
            </h3>
            
            {/* Excerpt */}
            <p className="text-sm text-muted-foreground line-clamp-2">
              {article.excerpt}
            </p>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{article.date}</span>
              <span>•</span>
              <span>{article.readTime} min read</span>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors group-hover:translate-x-0.5" />
          </div>
        </div>
      </article>
    </Link>
  );
}
