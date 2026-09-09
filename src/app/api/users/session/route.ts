import { NextRequest, NextResponse } from "next/server";
import { getUserByEmail, getUserById, verifyPassword } from "@/lib/models/utils";
import { getSessionUser } from "@/lib/auth/session";

/**
 * POST /api/users/session - Authenticates user credentials and creates session cookie
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const user = await getUserByEmail(email);
    if (!user || !user.hashed_password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const isValid = verifyPassword(password, user.hashed_password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const response = NextResponse.json({
      success: true,
      user: {
        _id: user._id.toString(),
        name: user.name,
        email: user.email,
        username: user.username,
      },
    });

    response.cookies.set("app_session", user._id.toString(), {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (error) {
    console.error("Login session error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/users/session - Returns current authenticated user
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser(req);
    if (!session) {
      return NextResponse.json({ user: null });
    }

    const user = await getUserById(session.userId);
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json({ user: null });
  }
}

/**
 * DELETE /api/users/session - Logs out user by clearing session cookie
 */
export async function DELETE() {
  const response = NextResponse.json({ success: true });
  response.cookies.delete("app_session");
  response.cookies.delete("authjs.session-token");
  return response;
}

