import { NextRequest, NextResponse } from "next/server";
import { UserSignupSchema } from "@/lib/models/schema";
import { getUserByEmail, hashPassword } from "@/lib/models/utils";
import { getDb } from "@/lib/db/mongodb";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => ({}));
    const parseResult = UserSignupSchema.safeParse(rawBody);

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

    const { name, email, username, password } = parseResult.data;

    // Check for existing user with this email
    const existing = await getUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation Error",
          errors: [`Email ${email} already exists`],
        },
        { status: 422 }
      );
    }

    const db = await getDb();
    const newUser = {
      name,
      email: email.toLowerCase(),
      username,
      provider: "local",
      hashed_password: hashPassword(password),
      authToken: "",
    };

    const result = await db.collection("users").insertOne(newUser);

    const response = NextResponse.json(
      {
        success: true,
        data: {
          _id: result.insertedId.toString(),
          name,
          email: email.toLowerCase(),
          username,
        },
      },
      { status: 201 }
    );

    response.cookies.set("app_session", result.insertedId.toString(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    return response;
  } catch (error) {
    console.error("POST /api/users error:", error);
    return NextResponse.json(
      { success: false, error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
