import { NextRequest, NextResponse } from "next/server";
import { ArticleInputSchema } from "@/lib/models/schema";
import { listArticles, normalizeTags, parseObjectId } from "@/lib/models/utils";
import { getSessionUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/mongodb";
import { trackAudit } from "@/lib/telemetry";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "15", 10);
    const item = searchParams.get("item");

    const criteria: Record<string, unknown> = {};
    if (item) {
      const objId = parseObjectId(item);
      if (objId) criteria._id = objId;
    }

    const result = await listArticles({ page, limit, criteria });

    return NextResponse.json({
      success: true,
      data: result.articles,
      meta: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      },
    });
  } catch (error) {
    console.error("GET /api/articles error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userObjectId = parseObjectId(session.userId);
    if (!userObjectId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
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

    const newArticle = {
      title,
      body,
      user: userObjectId,
      tags: normalizeTags(tags),
      comments: [],
      image: { files: [] },
      createdAt: new Date(),
    };

    const result = await db.collection("articles").insertOne(newArticle);
    const traceId = req.headers.get("x-trace-id") || undefined;

    await trackAudit(
      {
        action: "create",
        resourceType: "article",
        resourceId: result.insertedId.toString(),
        userId: session.userId,
        status: "success",
        details: {
          title,
          tags: newArticle.tags,
        },
      },
      { traceId }
    );

    return NextResponse.json(
      {
        success: true,
        data: {
          ...newArticle,
          _id: result.insertedId.toString(),
          user: userObjectId.toString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/articles error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

