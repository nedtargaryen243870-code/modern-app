import Link from "next/link";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  baseUrl?: string;
}

export function PaginationBar({
  currentPage,
  totalPages,
  baseUrl = "",
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  const createPageUrl = (page: number) => {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}page=${page}`;
  };

  const pages: number[] = [];
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-center space-x-1 sm:space-x-2 my-8 select-none"
    >
      {/* First Page */}
      {currentPage > 1 && (
        <Link
          href={createPageUrl(1)}
          className="inline-flex items-center justify-center size-9 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          title="First Page"
        >
          <ChevronsLeft className="size-4" />
        </Link>
      )}

      {/* Previous Page */}
      {currentPage > 1 && (
        <Link
          href={createPageUrl(currentPage - 1)}
          className="inline-flex items-center gap-1 px-3 h-9 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Previous Page"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">Previous</span>
        </Link>
      )}

      {/* Page Numbers */}
      {pages.map((p) => {
        const isActive = p === currentPage;
        return (
          <Link
            key={p}
            href={createPageUrl(p)}
            className={`inline-flex items-center justify-center size-9 rounded-md text-sm font-medium transition-colors ${
              isActive
                ? "bg-primary text-primary-foreground font-bold shadow-sm"
                : "border border-input bg-background hover:bg-accent hover:text-accent-foreground"
            }`}
          >
            {p}
          </Link>
        );
      })}

      {/* Next Page */}
      {currentPage < totalPages && (
        <Link
          href={createPageUrl(currentPage + 1)}
          className="inline-flex items-center gap-1 px-3 h-9 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Next Page"
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="size-4" />
        </Link>
      )}

      {/* Last Page */}
      {currentPage < totalPages && (
        <Link
          href={createPageUrl(totalPages)}
          className="inline-flex items-center justify-center size-9 rounded-md border border-input bg-background text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          title="Last Page"
        >
          <ChevronsRight className="size-4" />
        </Link>
      )}
    </nav>
  );
}

