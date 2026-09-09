import { notFound } from "next/navigation";
import { getArticleById } from "@/lib/models/utils";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { ArticleDetail } from "@/components/articles/ArticleDetail";
import { CommentSection } from "@/components/comments/CommentSection";

interface ArticlePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) {
    notFound();
  }

  const currentUser = await getCurrentUser();

  return (
    <div className="space-y-8 py-2 max-w-4xl">
      <ArticleDetail article={article} currentUser={currentUser} />
      <CommentSection
        articleId={article._id}
        articleAuthorId={article.user?._id}
        comments={article.comments}
        currentUser={currentUser}
      />
    </div>
  );
}

