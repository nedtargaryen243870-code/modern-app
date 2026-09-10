import { NextRequest, NextResponse } from "next/server";
import { getArticleById, parseObjectId, normalizeTags } from "@/lib/models/utils";
import { ArticleInputSchema } from "@/lib/models/schema";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { trackAudit } from "@/lib/telemetry";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const article = await getArticleById(id);

    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: article,
    });
  } catch (error) {
    console.error("GET /api/articles/:id error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const objectId = parseObjectId(id);
    if (!objectId) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    const session = await getSessionUser(req);
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const article = await getArticleById(objectId);
    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    // Ownership check (Article author check)
    const authorId = article.user?._id;
    if (!authorId || authorId !== session.userId) {
      return NextResponse.json(
        { success: false, error: "You are not authorized" },
        { status: 403 }
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const parseResult = ArticleInputSchema.safeParse(rawBody);

    if (!parseResult.success) {
      const errorMessages = parseResult.error.issues.map((issue) => issue.message);
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          errors: errorMessages,
        },
        { status: 422 }
      );
    }

    const { title, body, tags } = parseResult.data;
    const db = await getDb();

    await db.collection("articles").updateOne(
      { _id: objectId },
      {
        $set: {
          title,
          body,
          tags: normalizeTags(tags),
        },
      }
    );

    const updated = await getArticleById(objectId);
    const traceId = req.headers.get("x-trace-id") || undefined;

    await trackAudit(
      {
        action: "update",
        resourceType: "article",
        resourceId: objectId.toString(),
        userId: session.userId,
        status: "success",
        details: {
          title,
          tags: normalizeTags(tags),
        },
      },
      { traceId }
    );

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("PUT /api/articles/:id error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const objectId = parseObjectId(id);
    if (!objectId) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    const session = await getSessionUser(req);
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const article = await getArticleById(objectId);
    if (!article) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    // Ownership check (Article author check)
    const authorId = article.user?._id;
    if (!authorId || authorId !== session.userId) {
      return NextResponse.json(
        { success: false, error: "You are not authorized" },
        { status: 403 }
      );
    }

    const db = await getDb();
    await db.collection("articles").deleteOne({ _id: objectId });
    const traceId = req.headers.get("x-trace-id") || undefined;

    await trackAudit(
      {
        action: "delete",
        resourceType: "article",
        resourceId: objectId.toString(),
        userId: session.userId,
        status: "success",
      },
      { traceId }
    );

    return NextResponse.json({
      success: true,
      message: "Deleted successfully",
    });
  } catch (error) {
    console.error("DELETE /api/articles/:id error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

