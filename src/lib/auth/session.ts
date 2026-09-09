import { NextRequest } from "next/server";

export interface AuthSession {
  userId: string;
  email?: string;
  name?: string;
}

/**
 * Extracts authenticated user session from NextRequest.
 * Supports integration test header (x-test-user-id) as well as auth cookies.
 */
export async function getSessionUser(req: NextRequest): Promise<AuthSession | null> {
  const testUserId = req.headers.get("x-test-user-id");
  if (testUserId) {
    return { userId: testUserId };
  }

  // Check auth session cookie if available
  const authCookie =
    req.cookies.get("app_session") ||
    req.cookies.get("authjs.session-token") ||
    req.cookies.get("__Secure-authjs.session-token");
  if (authCookie && authCookie.value) {
    return { userId: authCookie.value };
  }

  return null;
}
