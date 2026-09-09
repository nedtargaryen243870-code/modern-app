import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import LoginForm from "./LoginForm";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const resolved = await searchParams;
  const next = resolved.next || "/";

  return (
    <div className="py-8 max-w-md mx-auto">
      <LoginForm next={next} />
    </div>
  );
}

