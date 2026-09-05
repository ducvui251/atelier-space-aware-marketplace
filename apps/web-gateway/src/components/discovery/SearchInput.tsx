"use client";

import { useState } from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  placeholder?: string;
  className?: string;
  id?: string;
  defaultValue?: string;
  disabled?: boolean;
  ariaLabel?: string;
  clearLabel?: string;
  onChange?: (value: string) => void;
}

export function SearchInput({
  placeholder = "Search artworks, artists, colors…",
  className,
  id,
  defaultValue = "",
  disabled = false,
  ariaLabel = "Search artworks",
  clearLabel = "Clear search",
  onChange,
}: SearchInputProps) {
  const [value, setValue] = useState(defaultValue);
  const hasValue = value.length > 0;

  function handleChange(next: string) {
    setValue(next);
    onChange?.(next);
  }

  function handleClear() {
    setValue("");
    onChange?.("");
  }

  return (
    <div className={cn("relative", className)}>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-subdued"
        aria-hidden="true"
      />
      <Input
        id={id}
        type="search"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={value}
        disabled={disabled}
        onChange={(event) => handleChange(event.target.value)}
        className="pl-10 pr-10 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden [&::-webkit-search-results-button]:hidden [&::-webkit-search-results-decoration]:hidden"
      />
      {hasValue ? (
        <button
          type="button"
          aria-label={clearLabel}
          disabled={disabled}
          onClick={handleClear}
          className="focus-ring absolute right-2 top-1/2 flex size-7 -translate-y-1/2 items-center justify-center rounded-full text-subdued transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      ) : null}
    </div>
  );
}
