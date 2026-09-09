import Link from "next/link";
import { Tag, Calendar, User as UserIcon } from "lucide-react";
import { ArticleWithRelations } from "@/lib/models/types";

interface ArticleCardProps {
  article: ArticleWithRelations;
}

export function ArticleCard({ article }: ArticleCardProps) {
  const authorName = article.user?.name || article.user?.username || "Anonymous";
  const authorId = article.user?._id;
  const createdAt = new Date(article.createdAt);
  const formattedDate = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    <article className="group py-6 first:pt-2 transition-all">
      <div className="space-y-2.5">
        <h2 className="text-2xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
          <Link href={`/articles/${article._id}`} className="hover:underline">
            {article.title.slice(0, 140)}
          </Link>
        </h2>

        <p className="text-muted-foreground text-base leading-relaxed line-clamp-3">
          {article.body.slice(0, 400)}
        </p>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground pt-1">
          <div className="flex items-center gap-1.5">
            <Calendar className="size-4 text-muted-foreground/70" />
            <time dateTime={createdAt.toISOString()}>{formattedDate}</time>
          </div>

          <div className="flex items-center gap-1.5">
            <UserIcon className="size-4 text-muted-foreground/70" />
            <span>Author:</span>
            {authorId ? (
              <Link
                href={`/users/${authorId}`}
                className="font-medium text-foreground hover:underline"
              >
                {authorName}
              </Link>
            ) : (
              <span className="font-medium">{authorName}</span>
            )}
          </div>

          {article.tags && article.tags.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <Tag className="size-4 text-muted-foreground/70" />
              <span>Tags:</span>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.slice(0, 10).map((tag) => (
                  <Link
                    key={tag}
                    href={`/tags/${encodeURIComponent(tag)}`}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground hover:bg-primary hover:text-primary-foreground transition-colors"
                  >
                    {tag}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

