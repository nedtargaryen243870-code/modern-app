"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Lock, Mail, User as UserIcon, AtSign } from "lucide-react";
import { SocialIcons } from "@/components/auth/SocialIcons";

interface SignupFormProps {
  next?: string;
}

export default function SignupForm({ next = "/" }: SignupFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors([]);
    setLoading(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, username: username || undefined }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.errors && Array.isArray(data.errors)) {
          setErrors(data.errors);
        } else {
          setErrors([data.error || "Failed to create account"]);
        }
        setLoading(false);
        return;
      }

      router.push(next || "/");
      router.refresh();
    } catch (err: unknown) {
      console.error("Signup client error:", err);
      setErrors(["Network error submitting signup"]);
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 sm:p-8 shadow-sm space-y-6">
      <div className="text-center space-y-1">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Sign up
        </h1>
        <p className="text-sm text-muted-foreground">
          Create an account to publish articles and comments
        </p>
      </div>

      {/* Social OAuth Icons */}
      <SocialIcons />

      {/* OR Divider */}
      <div className="relative flex items-center justify-center">
        <div className="border-t border-border w-full" />
        <span className="bg-card px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          OR
        </span>
        <div className="border-t border-border w-full" />
      </div>

      {errors.length > 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md text-destructive text-sm space-y-1">
          {errors.map((err, idx) => (
            <p key={idx}>{err}</p>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email */}
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Email address
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              id="email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Full Name */}
        <div className="space-y-1.5">
          <label
            htmlFor="name"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Full Name
          </label>
          <div className="relative">
            <UserIcon className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Username */}
        <div className="space-y-1.5">
          <label
            htmlFor="username"
            className="text-xs font-semibold text-muted-foreground uppercase tracking-wider"
          >
            Username
          </label>
          <div className="relative">
            <AtSign className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username (optional)"
              className="w-full h-10 pl-9 pr-3 rounded-md border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full h-10 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>
      </form>

      <div className="text-center text-sm text-muted-foreground">
        or{" "}
        <Link
          href={`/login${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="text-primary font-semibold hover:underline"
        >
          Log in
        </Link>
      </div>
    </div>
  );
}

