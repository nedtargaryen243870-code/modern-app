import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import { ArticleForm } from "@/components/articles/ArticleForm";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login?next=/articles/new");
  }

  return (
    <div className="py-4">
      <ArticleForm mode="create" />
    </div>
  );
}

