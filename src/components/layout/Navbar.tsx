"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Menu, X, Plus, LogOut, User as UserIcon, LogIn } from "lucide-react";
import { UserPublic } from "@/lib/models/types";

interface NavbarProps {
  user?: UserPublic | null;
}

export function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await fetch("/api/users/session", { method: "DELETE" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      setLoggingOut(false);
    }
  };

  const isActive = (path: string) => {
    if (path === "/" && pathname === "/") return true;
    if (path !== "/" && pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-zinc-900 text-white shadow-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Brand */}
          <div className="flex items-center space-x-6">
            <Link
              href="/"
              className="text-lg font-bold tracking-tight text-white hover:text-zinc-200 transition-colors"
            >
              Node.js Express Mongoose Demo
            </Link>

            {/* Desktop Left Nav Links */}
            <div className="hidden md:flex items-center space-x-2">
              <Link
                href="/articles/new"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                  isActive("/articles/new")
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-300 hover:text-white hover:bg-zinc-800/60"
                }`}
              >
                <Plus className="size-4" />
                New
              </Link>

              {user ? (
                <>
                  <Link
                    href={`/users/${user._id}`}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      isActive(`/users/${user._id}`)
                        ? "bg-zinc-800 text-white font-semibold"
                        : "text-zinc-300 hover:text-white hover:bg-zinc-800/60"
                    }`}
                  >
                    <UserIcon className="size-4" />
                    Profile
                  </Link>

                  <button
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="px-3 py-1.5 rounded-md text-sm font-medium text-zinc-300 hover:text-rose-400 hover:bg-zinc-800/60 transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="size-4" />
                    {loggingOut ? "Logging out..." : "Logout"}
                  </button>
                </>
              ) : (
                <Link
                  href="/login"
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-1.5 ${
                    isActive("/login")
                      ? "bg-zinc-800 text-white font-semibold"
                      : "text-zinc-300 hover:text-white hover:bg-zinc-800/60"
                  }`}
                >
                  <LogIn className="size-4" />
                  Login
                </Link>
              )}
            </div>
          </div>

          {/* Desktop Right Links */}
          <div className="hidden lg:flex items-center space-x-4 text-xs text-zinc-400">
            <a
              href="https://github.com/madhums/node-express-mongoose-demo"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 hover:text-white transition-colors"
            >
              <svg className="size-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              <span>GitHub Repo</span>
            </a>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
              Modern Next.js 16
            </span>
          </div>

          {/* Mobile menu button */}
          <div className="flex md:hidden">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              type="button"
              className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-zinc-800 bg-zinc-900 px-4 pt-2 pb-4 space-y-1">
          <Link
            href="/articles/new"
            onClick={() => setMobileMenuOpen(false)}
            className={`block px-3 py-2 rounded-md text-base font-medium ${
              isActive("/articles/new")
                ? "bg-zinc-800 text-white font-semibold"
                : "text-zinc-300 hover:text-white hover:bg-zinc-800"
            }`}
          >
            New Article
          </Link>

          {user ? (
            <>
              <Link
                href={`/users/${user._id}`}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-3 py-2 rounded-md text-base font-medium ${
                  isActive(`/users/${user._id}`)
                    ? "bg-zinc-800 text-white font-semibold"
                    : "text-zinc-300 hover:text-white hover:bg-zinc-800"
                }`}
              >
                Profile ({user.name || user.username})
              </Link>

              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleLogout();
                }}
                className="w-full text-left block px-3 py-2 rounded-md text-base font-medium text-rose-400 hover:bg-zinc-800 cursor-pointer"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileMenuOpen(false)}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive("/login")
                  ? "bg-zinc-800 text-white font-semibold"
                  : "text-zinc-300 hover:text-white hover:bg-zinc-800"
              }`}
            >
              Login
            </Link>
          )}
        </div>
      )}
    </nav>
  );
}

