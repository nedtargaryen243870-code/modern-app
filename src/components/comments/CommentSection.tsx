"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2, MessageSquare, Send } from "lucide-react";
import { PopulatedComment, UserPublic } from "@/lib/models/types";

interface CommentSectionProps {
  articleId: string;
  articleAuthorId?: string | null;
  comments: PopulatedComment[];
  currentUser?: UserPublic | null;
}

export function CommentSection({
  articleId,
  articleAuthorId,
  comments: initialComments,
  currentUser,
}: CommentSectionProps) {
  const router = useRouter();
  const [commentBody, setCommentBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;

    try {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/articles/${articleId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: commentBody.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to post comment");
      }

      setCommentBody("");
      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to post comment";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm("Are you sure you want to delete this comment?")) {
      return;
    }

    try {
      setDeletingId(commentId);
      setError(null);

      const res = await fetch(
        `/api/articles/${articleId}/comments/${commentId}`,
        {
          method: "DELETE",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete comment");
      }

      router.refresh();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete comment";
      setError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="pt-10 border-t border-border space-y-6">
      <div className="flex items-center gap-2">
        <MessageSquare className="size-5 text-primary" />
        <h3 className="text-2xl font-bold tracking-tight text-foreground">
          Comments ({initialComments.length})
        </h3>
      </div>

      {error && (
        <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md border border-destructive/20">
          {error}
        </div>
      )}

      {/* Comments List */}
      <div className="space-y-4">
        {initialComments.length === 0 ? (
          <p className="text-sm text-muted-foreground italic">
            No comments yet. Be the first to share your thoughts!
          </p>
        ) : (
          initialComments.map((comment, index) => {
            const commentAuthorName =
              comment.user?.name || comment.user?.username || "Anonymous";
            const commentAuthorId = comment.user?._id;

            // Comment Co-Authorization rule: comment author OR article owner can delete
            const canDelete =
              currentUser &&
              (currentUser._id === commentAuthorId ||
                currentUser._id === articleAuthorId);

            const createdAt = new Date(comment.createdAt);
            const formattedDate = createdAt.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={comment._id || index}
                className="p-4 rounded-lg bg-card border border-border space-y-2 shadow-xs"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm">
                    {commentAuthorId ? (
                      <Link
                        href={`/users/${commentAuthorId}`}
                        className="font-semibold text-foreground hover:underline"
                      >
                        {commentAuthorName}
                      </Link>
                    ) : (
                      <span className="font-semibold text-foreground">
                        {commentAuthorName}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      &bull; {formattedDate}
                    </span>
                  </div>

                  {canDelete && (
                    <button
                      onClick={() => handleDeleteComment(comment._id)}
                      disabled={deletingId === comment._id}
                      className="text-xs text-destructive hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="Delete comment"
                    >
                      <Trash2 className="size-3.5" />
                      {deletingId === comment._id ? "Deleting..." : "delete"}
                    </button>
                  )}
                </div>

                <p className="text-sm text-foreground/90 whitespace-pre-line leading-relaxed">
                  {comment.body.slice(0, 1000)}
                </p>
              </div>
            );
          })
        )}
      </div>

      {/* Comment Form */}
      <div className="pt-4">
        {currentUser ? (
          <form onSubmit={handleAddComment} className="space-y-3">
            <label
              htmlFor="comment-body"
              className="text-sm font-semibold text-foreground"
            >
              Add a comment
            </label>
            <textarea
              id="comment-body"
              rows={4}
              value={commentBody}
              onChange={(e) => setCommentBody(e.target.value)}
              placeholder="Add your comment..."
              required
              maxLength={1000}
              className="w-full p-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <button
              type="submit"
              disabled={loading || !commentBody.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Send className="size-3.5" />
              {loading ? "Adding..." : "Add comment"}
            </button>
          </form>
        ) : (
          <div className="p-4 rounded-md bg-muted/60 border border-border text-sm text-muted-foreground flex items-center justify-between">
            <span>You must be logged in to post a comment.</span>
            <Link
              href={`/login?next=/articles/${articleId}`}
              className="text-primary font-medium hover:underline"
            >
              Log in &rarr;
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

