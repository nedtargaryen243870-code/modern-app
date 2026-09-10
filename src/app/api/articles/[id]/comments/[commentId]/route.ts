import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { parseObjectId } from "@/lib/models/utils";
import { getDb } from "@/lib/db/mongodb";
import { trackAudit } from "@/lib/telemetry";

interface RouteContext {
  params: Promise<{ id: string; commentId: string }>;
}

/**
 * DELETE /api/articles/[id]/comments/[commentId] - Deletes comment enforcing Comment Co-Authorization rule
 * (allowed if user is the comment author OR the article author).
 */
export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id, commentId } = await params;
    const articleObjectId = parseObjectId(id);
    const commentObjectId = parseObjectId(commentId);

    if (!articleObjectId || !commentObjectId) {
      return NextResponse.json(
        { success: false, error: "Comment or Article not found" },
        { status: 404 }
      );
    }

    const db = await getDb();
    const article = await db.collection("articles").findOne({ _id: articleObjectId });
    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    const comments = article.comments || [];
    const targetComment = comments.find(
      (c: any) => c._id?.toString() === commentObjectId.toString()
    );

    if (!targetComment) {
      return NextResponse.json(
        { success: false, error: "Comment not found" },
        { status: 404 }
      );
    }

    // Comment Co-Authorization rule: comment author OR article author
    const articleAuthorId = article.user?.toString();
    const commentAuthorId = targetComment.user?.toString();
    const currentUserId = session.userId;

    const isAuthorized =
      currentUserId === commentAuthorId || currentUserId === articleAuthorId;

    if (!isAuthorized) {
      return NextResponse.json(
        { success: false, error: "You are not authorized" },
        { status: 403 }
      );
    }

    await db.collection("articles").updateOne(
      { _id: articleObjectId },
      { $pull: { comments: { _id: commentObjectId } } as any }
    );

    const traceId = req.headers.get("x-trace-id") || undefined;
    await trackAudit(
      {
        action: "delete",
        resourceType: "comment",
        resourceId: commentObjectId.toString(),
        userId: session.userId,
        status: "success",
        details: {
          articleId: id,
        },
      },
      { traceId }
    );

    return NextResponse.json({
      success: true,
      message: "Removed comment",
    });
  } catch (error) {
    console.error("DELETE comment error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
