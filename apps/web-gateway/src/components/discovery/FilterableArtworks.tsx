"use client";

import * as React from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SearchX, WifiOff } from "lucide-react";
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
}

export function FilterableArtworks({ results, allArtworks, query, unavailable }: FilterableArtworksProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = React.useTransition();

  const styleOptions = React.useMemo(() => deriveOptions(allArtworks, (a) => a.style), [allArtworks]);
  const colorOptions = React.useMemo(() => deriveOptions(allArtworks, (a) => a.dominantColors), [allArtworks]);

  function updateQuery(patch: Partial<ArtworkFilterQuery>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const active = Object.values(query).some((v) => Boolean(v));

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
          {results.length} {results.length === 1 ? "work" : "works"}
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
    </div>
  );
}

export function orientationLabel(orientation: ArtworkOrientation): string {
  return ORIENTATION_OPTIONS.find((o) => o.value === orientation)?.label ?? orientation;
}
