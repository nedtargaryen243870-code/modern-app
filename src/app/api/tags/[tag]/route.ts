import { NextRequest, NextResponse } from "next/server";
import { listArticles } from "@/lib/models/utils";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ tag: string }> }
) {
  try {
    const { tag } = await context.params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "30", 10);

    const result = await listArticles({
      page,
      limit,
      criteria: { tags: tag },
    });

    return NextResponse.json({
      success: true,
      data: result.articles,
      meta: {
        tag,
        page: result.page,
        limit: result.limit,
        total: result.total,
        pages: result.pages,
      },
    });
  } catch (error) {
    console.error("GET /api/tags/:tag error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

