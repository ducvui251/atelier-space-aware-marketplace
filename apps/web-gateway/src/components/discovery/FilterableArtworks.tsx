"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight, SearchX, WifiOff } from "lucide-react";
import type { Artwork, ArtworkOrientation } from "@/types";
import { SearchInput } from "@/components/discovery/SearchInput";
import { ArtworkGrid, ArtworkGridSkeleton } from "@/components/artwork/ArtworkGrid";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PRICE_BUCKETS, type ArtworkFilterQuery } from "@/lib/artwork-filters";

export type { ArtworkFilterQuery };

const ORIENTATION_OPTIONS: { value: string; label: string }[] = [
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
  { value: "square", label: "Square" },
];

const EDITION_OPTIONS: { value: string; label: string }[] = [
  { value: "original", label: "Original" },
  { value: "limited-edition", label: "Limited edition" },
];

const AVAILABILITY_OPTIONS: { value: string; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "reserved", label: "Reserved" },
  { value: "sold", label: "Sold" },
];

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

function deriveOptions(artworks: Artwork[], pick: (artwork: Artwork) => string[]): { value: string; label: string }[] {
  const seen = new Set<string>();
  const options: { value: string; label: string }[] = [];
  for (const artwork of artworks) {
    for (const value of pick(artwork)) {
      if (!seen.has(value)) {
        seen.add(value);
        options.push({ value, label: value });
      }
    }
  }
  return options.sort((a, b) => a.label.localeCompare(b.label));
}

interface FilterSelectProps {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

function FilterSelect({ label, value, options, onChange, disabled }: FilterSelectProps) {
  const id = `filter-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="focus-ring h-11 min-w-[160px] rounded-md border border-border bg-surface px-3 text-body-sm text-foreground disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">Any {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface FilterableArtworksProps {
  results: Artwork[];
  allArtworks: Artwork[];
  query: ArtworkFilterQuery;
  unavailable?: boolean;
  totalResults?: number;
  currentPage?: number;
  totalPages?: number;
}

export function FilterableArtworks({ results, allArtworks, query, unavailable, totalResults, currentPage = 1, totalPages = 1 }: FilterableArtworksProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const styleOptions = React.useMemo(() => deriveOptions(allArtworks, (a) => a.style), [allArtworks]);
  const colorOptions = React.useMemo(() => deriveOptions(allArtworks, (a) => a.dominantColors), [allArtworks]);

  function updateQuery(patch: Partial<ArtworkFilterQuery>, options: { resetPage?: boolean } = {}) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    // Any filter/search change narrows or widens the result set, so a page
    // number carried over from before would point at the wrong (or a now
    // out-of-range) slice — reset to page 1 whenever something other than
    // the page itself changes.
    if (options.resetPage ?? true) params.delete("page");
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  function goToPage(target: number) {
    updateQuery({ page: target > 1 ? String(target) : undefined }, { resetPage: false });
  }

  // page is a position in the results, not a filter — being on page 2 alone
  // shouldn't surface "Clear all" when no actual filter is set.
  const active = Object.entries(query).some(([key, value]) => key !== "page" && Boolean(value));

  function clearAll() {
    startTransition(() => {
      router.push(pathname, { scroll: false });
    });
  }

  if (unavailable) {
    return (
      <EmptyState
        icon={WifiOff}
        title="Artworks are unavailable right now"
        description="We couldn't reach the catalog. Please try again in a moment."
        action={
          <Button variant="outline" size="sm" onClick={() => router.refresh()}>
            Retry
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <SearchInput
        id="search"
        className="max-w-xl"
        defaultValue={query.q ?? ""}
        onChange={(value) => updateQuery({ q: value })}
      />

      <div className="flex flex-wrap items-end gap-4">
        <FilterSelect label="Style" value={query.style ?? ""} options={styleOptions} onChange={(value) => updateQuery({ style: value })} disabled={isPending} />
        <FilterSelect label="Color" value={query.color ?? ""} options={colorOptions} onChange={(value) => updateQuery({ color: value })} disabled={isPending} />
        <FilterSelect label="Orientation" value={query.orientation ?? ""} options={ORIENTATION_OPTIONS} onChange={(value) => updateQuery({ orientation: value })} disabled={isPending} />
        <FilterSelect label="Edition" value={query.edition ?? ""} options={EDITION_OPTIONS} onChange={(value) => updateQuery({ edition: value })} disabled={isPending} />
        <FilterSelect label="Availability" value={query.availability ?? ""} options={AVAILABILITY_OPTIONS} onChange={(value) => updateQuery({ availability: value })} disabled={isPending} />
        <FilterSelect label="Price" value={query.price ?? ""} options={PRICE_BUCKETS} onChange={(value) => updateQuery({ price: value })} disabled={isPending} />
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 text-caption text-muted-foreground">
        <span>
          {totalResults ?? results.length} {(totalResults ?? results.length) === 1 ? "work" : "works"}
          {totalPages > 1 ? ` · page ${currentPage} of ${totalPages}` : ""}
        </span>
        {active ? (
          <Button variant="ghost" size="sm" onClick={clearAll} disabled={isPending}>
            Clear all
          </Button>
        ) : null}
      </div>

      <div className={cn(isPending && "opacity-60 transition-opacity")} aria-busy={isPending}>
        {isPending ? (
          <ArtworkGridSkeleton />
        ) : results.length > 0 ? (
          <ArtworkGrid artworks={results} columns={3} />
        ) : (
          <EmptyState
            icon={SearchX}
            title="No works found"
            description="Nothing matches the current filters. Try clearing a filter or searching for something else."
            action={
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            }
          />
        )}
      </div>

      {totalPages > 1 ? (
        <nav aria-label="Artwork catalog pages" className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="size-10 rounded-full"
            aria-label="Previous page"
            disabled={currentPage <= 1 || isPending}
            onClick={() => goToPage(currentPage - 1)}
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
                disabled={isPending}
                onClick={() => goToPage(token)}
                className={cn(
                  "focus-ring flex size-10 shrink-0 items-center justify-center rounded-full text-body-sm font-medium transition-colors duration-normal disabled:pointer-events-none disabled:opacity-50",
                  token === currentPage
                    ? "border border-foreground text-foreground"
                    : "text-muted-foreground hover:bg-muted",
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
            disabled={currentPage >= totalPages || isPending}
            onClick={() => goToPage(currentPage + 1)}
          >
            <ChevronRight />
          </Button>
        </nav>
      ) : null}
    </div>
  );
}

export function orientationLabel(orientation: ArtworkOrientation): string {
  return ORIENTATION_OPTIONS.find((o) => o.value === orientation)?.label ?? orientation;
}
