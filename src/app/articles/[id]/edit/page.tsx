import { notFound, redirect } from "next/navigation";
import { getArticleById } from "@/lib/models/utils";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { ArticleForm } from "@/components/articles/ArticleForm";

interface EditArticlePageProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params;
  const article = await getArticleById(id);

  if (!article) {
    notFound();
  }

  const user = await getCurrentUser();

  if (!user) {
    redirect(`/login?next=/articles/${id}/edit`);
  }

  // Ownership Guard
  const authorId = article.user?._id?.toString();
  if (user._id !== authorId) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-2xl font-bold text-destructive mb-2">
          Unauthorized
        </h2>
        <p className="text-muted-foreground">
          You are not authorized to edit this article.
        </p>
      </div>
    );
  }

  return (
    <div className="py-4">
      <ArticleForm initialData={article} mode="edit" />
    </div>
  );
}

