import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/session";
import { parseObjectId } from "@/lib/models/utils";
import { CommentInputSchema } from "@/lib/models/schema";
import { getDb } from "@/lib/db/mongodb";
import { ObjectId } from "mongodb";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/articles/[id]/comments - Adds a comment to the specified article
 */
export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const articleObjectId = parseObjectId(id);
    if (!articleObjectId) {
      return NextResponse.json(
        { success: false, error: "Article not found" },
        { status: 404 }
      );
    }

    const rawBody = await req.json().catch(() => ({}));
    const parseResult = CommentInputSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const errorMessages = parseResult.error.issues.map((i) => i.message);
      return NextResponse.json(
        { success: false, error: "Validation Error", errors: errorMessages },
        { status: 422 }
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

    const userObjectId = parseObjectId(session.userId);
    const newComment = {
      _id: new ObjectId(),
      body: parseResult.data.body,
      user: userObjectId || session.userId,
      createdAt: new Date(),
    };

    await db.collection("articles").updateOne(
      { _id: articleObjectId },
      { $push: { comments: newComment } as any }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          ...newComment,
          _id: newComment._id.toString(),
          user: session.userId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/articles/[id]/comments error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/articles/[id]/comments - Legacy route normalization redirect
 */
export async function GET(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  return NextResponse.redirect(new URL(`/articles/${id}`, req.url));
}

