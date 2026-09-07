"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface SaveButtonProps {
  saved: boolean;
  disabled?: boolean;
  onToggle: () => void;
  className?: string;
}

export function SaveButton({ saved, disabled = false, onToggle, className }: SaveButtonProps) {
  return (
    <button
      type="button"
      aria-label={saved ? "Remove saved artwork" : "Save artwork"}
      aria-pressed={saved}
      disabled={disabled}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
      className={cn(
        "focus-ring absolute right-3 top-3 flex size-9 items-center justify-center rounded-full bg-surface/80 shadow-xs backdrop-blur-sm transition-opacity duration-normal",
        "disabled:pointer-events-none disabled:opacity-50",
        saved
          ? "text-destructive opacity-100"
          : "text-foreground opacity-0 hover:bg-surface focus-visible:opacity-100 group-hover:opacity-100",
        className,
      )}
    >
      <Heart className={cn("size-4", saved && "fill-current")} />
    </button>
  );
}
