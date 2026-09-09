import { cookies } from "next/headers";
import { getUserById } from "@/lib/models/utils";
import { UserPublic } from "@/lib/models/types";

/**
 * Retrieves the current authenticated user in Server Components and Route Handlers.
 */
export async function getCurrentUser(): Promise<UserPublic | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie =
      cookieStore.get("app_session")?.value ||
      cookieStore.get("authjs.session-token")?.value ||
      cookieStore.get("__Secure-authjs.session-token")?.value;

    if (!sessionCookie) return null;

    const user = await getUserById(sessionCookie);
    return user;
  } catch (error) {
    if ((error as { digest?: string })?.digest === "DYNAMIC_SERVER_USAGE") {
      throw error;
    }
    console.error("getCurrentUser error:", error);
    return null;
  }
}

