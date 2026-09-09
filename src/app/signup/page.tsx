import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/currentUser";
import SignupForm from "./SignupForm";

interface SignupPageProps {
  searchParams: Promise<{ next?: string }>;
}

export const dynamic = "force-dynamic";

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/");
  }

  const resolved = await searchParams;
  const next = resolved.next || "/";

  return (
    <div className="py-8 max-w-md mx-auto">
      <SignupForm next={next} />
    </div>
  );
}

