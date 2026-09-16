"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ELLIPSIS = "…" as const;
type PageToken = number | typeof ELLIPSIS;

/** First page, last page, current ± 1 sibling, "…" for any gap in between. */
function getPageWindow(current: number, total: number): PageToken[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const tokens: PageToken[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) tokens.push(ELLIPSIS);
  for (let page = start; page <= end; page++) tokens.push(page);
  if (end < total - 1) tokens.push(ELLIPSIS);
  tokens.push(total);
  return tokens;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  disabled?: boolean;
  label?: string;
}

/** Same numbered-page UI as the public /artworks catalog (FilterableArtworks). */
export function Pagination({ currentPage, totalPages, onPageChange, disabled, label = "Pages" }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <nav aria-label={label} className="flex items-center justify-center gap-2">
      <Button
        variant="outline"
        size="icon"
        className="size-10 rounded-full"
        aria-label="Previous page"
        disabled={currentPage <= 1 || disabled}
        onClick={() => onPageChange(currentPage - 1)}
      >
        <ChevronLeft />
      </Button>
      {getPageWindow(currentPage, totalPages).map((token, index) =>
        token === ELLIPSIS ? (
          <span key={`ellipsis-${index}`} className="px-1 text-body-sm text-muted-foreground">
            {ELLIPSIS}
          </span>
        ) : (
          <button
            key={token}
            type="button"
            aria-label={`Page ${token}`}
            aria-current={token === currentPage ? "page" : undefined}
            disabled={disabled}
            onClick={() => onPageChange(token)}
            className={cn(
              "focus-ring flex size-10 shrink-0 items-center justify-center rounded-full text-body-sm font-medium transition-colors duration-normal disabled:pointer-events-none disabled:opacity-50",
              token === currentPage ? "border border-foreground text-foreground" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {token}
          </button>
        ),
      )}
      <Button
        variant="outline"
        size="icon"
        className="size-10 rounded-full"
        aria-label="Next page"
        disabled={currentPage >= totalPages || disabled}
        onClick={() => onPageChange(currentPage + 1)}
      >
        <ChevronRight />
      </Button>
    </nav>
  );
}
