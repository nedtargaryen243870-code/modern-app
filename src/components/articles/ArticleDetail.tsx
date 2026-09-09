"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Calendar, User as UserIcon, Tag, Edit, Trash2 } from "lucide-react";
import { ArticleWithRelations, UserPublic } from "@/lib/models/types";

interface ArticleDetailProps {
  article: ArticleWithRelations;
  currentUser?: UserPublic | null;
}

export function ArticleDetail({ article, currentUser }: ArticleDetailProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authorName = article.user?.name || article.user?.username || "Anonymous";
  const authorId = article.user?._id;
  const isOwner =
    currentUser &&
    authorId &&
    (currentUser._id === authorId || currentUser._id === article.user?._id?.toString());

  const createdAt = new Date(article.createdAt);
  const formattedDate = createdAt.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this article?")) {
      return;
    }

    try {
      setIsDeleting(true);
      setError(null);
      const res = await fetch(`/api/articles/${article._id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete article");
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete article";
      setError(msg);
      setIsDeleting(false);
    }
  };

  const hasImage =
    article.image &&
    article.image.files &&
    article.image.files.length > 0 &&
    article.image.files[0];

  const imageUrl = hasImage
    ? `${article.image.cdnUri || ""}/mini_${article.image.files[0]}`
    : null;

  return (
    <div className="space-y-6">
      {/* Title */}
      <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
        {article.title.slice(0, 400)}
      </h1>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-8 space-y-6">
          {/* Article Body */}
          <div className="text-lg leading-relaxed text-foreground/90 whitespace-pre-line">
            {article.body.slice(0, 1000)}
          </div>

          {/* Metadata */}
          <div className="pt-4 border-t border-border space-y-2 text-sm text-muted-foreground">
            {authorId && (
              <p className="flex items-center gap-1.5">
                <UserIcon className="size-4" />
                <span>Author:</span>
                <Link
                  href={`/users/${authorId}`}
                  className="font-medium text-foreground hover:underline"
                >
                  {authorName}
                </Link>
              </p>
            )}

            {article.tags && article.tags.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap">
                <Tag className="size-4" />
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

            <p className="flex items-center gap-1.5 text-xs text-muted-foreground/80">
              <Calendar className="size-3.5" />
              <span>{formattedDate}</span>
            </p>
          </div>
        </div>

        {/* Image Column */}
        {imageUrl && (
          <div className="md:col-span-4">
            <div className="rounded-lg border border-border overflow-hidden shadow-sm bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={article.title}
                className="w-full h-auto object-cover max-h-64"
                onError={(e) => {
                  // If image fails to load (e.g. mock cdn), hide parent
                  (e.target as HTMLElement).style.display = "none";
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons (Owner only) */}
      {isOwner && (
        <div className="flex items-center gap-3 pt-4 border-t border-border">
          <Link
            href={`/articles/${article._id}/edit`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <Edit className="size-4" />
            Edit
          </Link>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
          >
            <Trash2 className="size-4" />
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      )}
    </div>
  );
}

