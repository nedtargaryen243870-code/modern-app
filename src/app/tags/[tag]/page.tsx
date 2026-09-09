import Link from "next/link";
import { listArticles } from "@/lib/models/utils";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { PaginationBar } from "@/components/ui/PaginationBar";
import { ArticleWithRelations } from "@/lib/models/types";

interface TagPageProps {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ page?: string }>;
}

export const dynamic = "force-dynamic";

export default async function TagPage({ params, searchParams }: TagPageProps) {
  const { tag } = await params;
  const decodedTag = decodeURIComponent(tag);
  const resolvedSearchParams = await searchParams;
  const page = Math.max(
    1,
    parseInt(resolvedSearchParams.page || "1", 10) || 1
  );

  // Legacy limit for tag queries is 30
  const { articles, total, pages } = await listArticles({
    page,
    limit: 30,
    criteria: { tags: decodedTag },
  });

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-4 flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Articles tagged {decodedTag}
        </h1>
        <span className="text-sm text-muted-foreground">
          {total} {total === 1 ? "article" : "articles"}
        </span>
      </div>

      {articles.length > 0 ? (
        <div className="divide-y divide-border">
          {articles.map((article) => (
            <ArticleCard
              key={article._id}
              article={article as unknown as ArticleWithRelations}
            />
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <h3 className="text-xl font-medium text-muted-foreground">
            No articles found tagged &quot;{decodedTag}&quot;.{" "}
            <Link href="/" className="text-primary font-semibold hover:underline">
              View all articles
            </Link>
          </h3>
        </div>
      )}

      {pages > 1 && (
        <PaginationBar
          currentPage={page}
          totalPages={pages}
          baseUrl={`/tags/${encodeURIComponent(decodedTag)}`}
        />
      )}
    </div>
  );
}

