"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArticleWithRelations } from "@/lib/models/types";

interface ArticleFormProps {
  initialData?: ArticleWithRelations | null;
  mode: "create" | "edit";
}

export function ArticleForm({ initialData, mode }: ArticleFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialData?.title || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [tags, setTags] = useState(
    initialData?.tags ? initialData.tags.join(", ") : ""
  );
  const [imageFile, setImageFile] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    try {
      const endpoint =
        mode === "create"
          ? "/api/articles"
          : `/api/articles/${initialData?._id}`;
      const method = mode === "create" ? "POST" : "PUT";

      const payload = {
        title,
        body,
        tags,
        ...(imageFile ? { image: { cdnUri: "", files: [imageFile] } } : {}),
      };

      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          setErrors(data.errors);
        } else {
          setErrors([data.error || "An error occurred"]);
        }
        setLoading(false);
        return;
      }

      const articleId = data.data?._id || initialData?._id;
      if (articleId) {
        router.push(`/articles/${articleId}`);
      } else {
        router.push("/");
      }
      router.refresh();
    } catch (err: unknown) {
      console.error("Article submit error:", err);
      setErrors(["Network error submitting form"]);
      setLoading(false);
    }
  };

  const existingImage =
    initialData?.image &&
    initialData.image.files &&
    initialData.image.files.length > 0 &&
    initialData.image.files[0];

  return (
    <div className="max-w-3xl">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground mb-6">
        {mode === "create" ? "New Article" : "Edit Article"}
      </h1>

      {errors.length > 0 && (
        <div className="mb-6 p-4 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm space-y-1">
          {errors.map((err, idx) => (
            <p key={idx}>{err}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-semibold text-foreground">
            Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter the title"
            required
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Image / Thumbnail */}
        <div className="space-y-2">
          <label htmlFor="image" className="text-sm font-semibold text-foreground">
            Image Filename / URL
          </label>
          <input
            id="image"
            type="text"
            value={imageFile}
            onChange={(e) => setImageFile(e.target.value)}
            placeholder="Optional image filename (e.g. hero.jpg)"
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {existingImage && (
            <p className="text-xs text-muted-foreground">
              Current image: {existingImage}
            </p>
          )}
        </div>

        {/* Body */}
        <div className="space-y-2">
          <label htmlFor="body" className="text-sm font-semibold text-foreground">
            Body
          </label>
          <textarea
            id="body"
            rows={7}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Enter the article description"
            required
            maxLength={1000}
            className="w-full p-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <p className="text-xs text-muted-foreground text-right">
            {body.length} / 1000 characters
          </p>
        </div>

        {/* Tags */}
        <div className="space-y-2">
          <label htmlFor="tags" className="text-sm font-semibold text-foreground">
            Tags
          </label>
          <input
            id="tags"
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="Enter the tags (comma-separated, max 10)"
            className="w-full h-10 px-3 rounded-md border border-input bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {loading ? "Saving..." : "Save"}
          </button>

          <Link
            href={initialData ? `/articles/${initialData._id}` : "/"}
            className="px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  );
}

