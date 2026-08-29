"use client";

import * as React from "react";
import { SearchX } from "lucide-react";
import type { Artwork } from "@/types";
import { FilterChip } from "@/components/discovery/FilterChip";
import { ArtworkGrid } from "@/components/artwork/ArtworkGrid";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";

type FilterKey = "style" | "medium" | "edition";

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

function emptyFilterState(): FilterState {
  return {
    style: new Set<string>(),
    medium: new Set<string>(),
    edition: new Set<string>(),
  };
}

function hasActiveFilters(state: FilterState): boolean {
  return state.style.size > 0 || state.medium.size > 0 || state.edition.size > 0;
}

function deriveStyleOptions(artworks: Artwork[]): FilterOption[] {
  const seen = new Set<string>();
  const options: FilterOption[] = [];
  for (const artwork of artworks) {
    for (const style of artwork.style) {
      if (!seen.has(style)) {
        seen.add(style);
        options.push({ value: style, label: style });
      }
    }
  }
  return options;
}

function deriveMediumOptions(artworks: Artwork[]): FilterOption[] {
  const seen = new Set<string>();
  const options: FilterOption[] = [];
  for (const artwork of artworks) {
    if (!seen.has(artwork.medium)) {
      seen.add(artwork.medium);
      options.push({ value: artwork.medium, label: artwork.medium });
    }
  }
  return options;
}

interface FilterableArtworksProps {
  artworks: Artwork[];
}

export function FilterableArtworks({ artworks }: FilterableArtworksProps) {
  const [filters, setFilters] = React.useState<FilterState>(emptyFilterState);

  const groups = React.useMemo<FilterDefinition[]>(() => {
    const styleOptions = deriveStyleOptions(artworks);
    const mediumOptions = deriveMediumOptions(artworks);
    return [
      {
        key: "style",
        title: "Style",
        options: styleOptions,
        matches: (artwork, selected) =>
          selected.size === 0 || artwork.style.some((tag) => selected.has(tag)),
      },
      {
        key: "medium",
        title: "Medium",
        options: mediumOptions,
        matches: (artwork, selected) =>
          selected.size === 0 || selected.has(artwork.medium),
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

  const clearAll = () => setFilters(emptyFilterState());

  return (
    <div className="flex flex-col gap-6">
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
          description="Try adjusting your filters to see more artworks."
          action={
            <Button variant="outline" size="sm" onClick={clearAll}>
              Clear filters
            </Button>
          }
        />
      )}
    </div>
  );
}
