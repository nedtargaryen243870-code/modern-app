import { notFound } from "next/navigation";
import Link from "next/link";
import { getUserById, listArticles, parseObjectId } from "@/lib/models/utils";
import { ArticleCard } from "@/components/articles/ArticleCard";
import { User, Mail, Calendar, FileText } from "lucide-react";
import { ArticleWithRelations } from "@/lib/models/types";

interface UserProfilePageProps {
  params: Promise<{ userId: string }>;
  searchParams: Promise<{ page?: string }>;
}

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
  searchParams,
}: UserProfilePageProps) {
  const { userId } = await params;
  const user = await getUserById(userId);

  if (!user) {
    notFound();
  }

  const userObjectId = parseObjectId(userId);
  const resolvedSearchParams = await searchParams;
  const page = Math.max(
    1,
    parseInt(resolvedSearchParams.page || "1", 10) || 1
  );

  const { articles, total } = userObjectId
    ? await listArticles({
        page,
        limit: 15,
        criteria: { user: userObjectId },
      })
    : { articles: [], total: 0 };

  const displayName = user.name || user.username || "User";

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Profile Header */}
      <div className="bg-card border border-border rounded-xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-6 shadow-xs">
        <div className="size-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
          <User className="size-10" />
        </div>

        <div className="space-y-1.5 flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            {displayName}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground pt-1">
            {user.username && (
              <span className="font-medium">@{user.username}</span>
            )}
            {user.email && (
              <span className="flex items-center gap-1.5">
                <Mail className="size-3.5" />
                {user.email}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <FileText className="size-3.5" />
              {total} {total === 1 ? "article" : "articles"}
            </span>
          </div>
        </div>
      </div>

      {/* User's Articles Section */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-foreground border-b border-border pb-3">
          Articles by {displayName}
        </h2>

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
          <p className="text-muted-foreground italic py-6">
            {displayName} has not published any articles yet.
          </p>
        )}
      </div>
    </div>
  );
}

