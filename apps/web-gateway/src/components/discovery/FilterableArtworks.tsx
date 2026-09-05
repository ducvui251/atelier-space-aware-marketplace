"use client";

import * as React from "react";
import { SearchX } from "lucide-react";
import type { Artwork, ArtworkOrientation } from "@/types";
import { FilterChip } from "@/components/discovery/FilterChip";
import { SearchInput } from "@/components/discovery/SearchInput";
import { ArtworkGrid } from "@/components/artwork/ArtworkGrid";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAppState } from "@/lib/store/hooks";

type FilterKey = "style" | "medium" | "edition" | "orientation" | "color" | "price";

interface FilterOption {
  value: string;
  label: string;
}

interface FilterDefinition {
  key: FilterKey;
  title: string;
  options: FilterOption[];
  matches: (artwork: Artwork, selected: Set<string>) => boolean;
}

export type FilterState = Record<FilterKey, Set<string>>;

const EDITION_OPTIONS: FilterOption[] = [
  { value: "original", label: "Original" },
  { value: "limited-edition", label: "Limited edition" },
];

const ORIENTATION_OPTIONS: FilterOption[] = [
  { value: "portrait", label: "Portrait" },
  { value: "landscape", label: "Landscape" },
  { value: "square", label: "Square" },
];

const PRICE_BUCKETS: { value: string; label: string; test: (price: number) => boolean }[] = [
  { value: "under-700", label: "Under $700", test: (p) => p < 700 },
  { value: "700-1200", label: "$700 – $1,200", test: (p) => p >= 700 && p <= 1200 },
  { value: "over-1200", label: "Over $1,200", test: (p) => p > 1200 },
];

function emptyFilterState(): FilterState {
  return {
    style: new Set<string>(),
    medium: new Set<string>(),
    edition: new Set<string>(),
    orientation: new Set<string>(),
    color: new Set<string>(),
    price: new Set<string>(),
  };
}

function hasActiveFilters(state: FilterState): boolean {
  return Object.values(state).some((set) => set.size > 0);
}

function deriveOptions(artworks: Artwork[], pick: (artwork: Artwork) => string[]): FilterOption[] {
  const seen = new Set<string>();
  const options: FilterOption[] = [];
  for (const artwork of artworks) {
    for (const value of pick(artwork)) {
      if (!seen.has(value)) {
        seen.add(value);
        options.push({ value, label: value });
      }
    }
  }
  return options;
}

interface FilterableArtworksProps {
  artworks?: Artwork[];
}

export function FilterableArtworks({ artworks: initialArtworks }: FilterableArtworksProps) {
  const { db } = useAppState();
  const [filters, setFilters] = React.useState<FilterState>(emptyFilterState);
  const [query, setQuery] = React.useState("");

  const artworks = React.useMemo(() => {
    const source = db.artworks.length > 0 ? db.artworks : initialArtworks ?? [];
    const q = query.trim().toLowerCase();
    if (!q) return source;
    return source.filter((artwork) =>
      [artwork.title, artwork.artist, artwork.medium, ...artwork.style, ...artwork.dominantColors]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [db.artworks, initialArtworks, query]);

  const groups = React.useMemo<FilterDefinition[]>(() => {
    const styleOptions = deriveOptions(artworks, (a) => a.style);
    const mediumOptions = deriveOptions(artworks, (a) => [a.medium]);
    const colorOptions = deriveOptions(artworks, (a) => a.dominantColors);
    return [
      {
        key: "style",
        title: "Style",
        options: styleOptions,
        matches: (artwork, selected) =>
          selected.size === 0 || artwork.style.some((tag) => selected.has(tag)),
      },
      {
        key: "color",
        title: "Màu chủ đạo",
        options: colorOptions,
        matches: (artwork, selected) =>
          selected.size === 0 || artwork.dominantColors.some((c) => selected.has(c)),
      },
      {
        key: "orientation",
        title: "Hướng tranh",
        options: ORIENTATION_OPTIONS,
        matches: (artwork, selected) =>
          selected.size === 0 || selected.has(artwork.orientation),
      },
      {
        key: "medium",
        title: "Medium",
        options: mediumOptions,
        matches: (artwork, selected) =>
          selected.size === 0 || selected.has(artwork.medium),
      },
      {
        key: "price",
        title: "Khoảng giá",
        options: PRICE_BUCKETS.map(({ value, label }) => ({ value, label })),
        matches: (artwork, selected) => {
          if (selected.size === 0) return true;
          return PRICE_BUCKETS.some(
            (bucket) => selected.has(bucket.value) && bucket.test(artwork.price),
          );
        },
      },
      {
        key: "edition",
        title: "Edition",
        options: EDITION_OPTIONS,
        matches: (artwork, selected) =>
          selected.size === 0 || selected.has(artwork.editionType),
      },
    ];
  }, [artworks]);

  const filtered = React.useMemo(
    () =>
      artworks.filter((artwork) =>
        groups.every((group) => group.matches(artwork, filters[group.key])),
      ),
    [artworks, groups, filters],
  );

  const active = hasActiveFilters(filters);

  const toggle = (key: FilterKey) => (value: string) => {
    setFilters((prev) => {
      const next = new Set(prev[key]);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return { ...prev, [key]: next };
    });
  };

  const clearAll = () => {
    setFilters(emptyFilterState());
    setQuery("");
  };

  const suggestions = React.useMemo(() => {
    if (filtered.length > 0) return [];
    // Alternative style suggestions that actually have results on their own.
    const styleOptions = groups.find((g) => g.key === "style")?.options ?? [];
    return styleOptions
      .filter((option) => artworks.some((a) => a.style.includes(option.value)))
      .slice(0, 4);
  }, [filtered, groups, artworks]);

  return (
    <div className="flex flex-col gap-6">
      <SearchInput
        id="search"
        className="max-w-xl"
        defaultValue={query}
        onChange={setQuery}
      />

      <div className="flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.key}>
            <p className="eyebrow mb-2">{group.title}</p>
            <div className="flex flex-wrap gap-2">
              {group.options.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  selected={filters[group.key].has(option.value)}
                  onClick={() => toggle(group.key)(option.value)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-4 text-caption text-muted-foreground">
        <span>
          {filtered.length} {filtered.length === 1 ? "work" : "works"}
        </span>
        {active ? (
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear all
          </Button>
        ) : null}
      </div>

      {filtered.length > 0 ? (
        <ArtworkGrid artworks={filtered} columns={3} />
      ) : (
        <EmptyState
          icon={SearchX}
          title="No works found"
          description="Không có tác phẩm khớp với bộ lọc hiện tại. Thử một trong các phong cách sau, hoặc xoá hết bộ lọc."
          action={
            <div className="flex flex-col items-center gap-3">
              {suggestions.length > 0 ? (
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestions.map((option) => (
                    <FilterChip
                      key={option.value}
                      label={option.label}
                      selected={false}
                      onClick={() => {
                        setFilters({ ...emptyFilterState(), style: new Set([option.value]) });
                      }}
                    />
                  ))}
                </div>
              ) : null}
              <Button variant="outline" size="sm" onClick={clearAll}>
                Clear filters
              </Button>
            </div>
          }
        />
      )}
    </div>
  );
}

export function orientationLabel(orientation: ArtworkOrientation): string {
  return ORIENTATION_OPTIONS.find((o) => o.value === orientation)?.label ?? orientation;
}
