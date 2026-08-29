import { cn } from "@/lib/utils";

interface FilterChipProps {
  label: string;
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}

export function FilterChip({
  label,
  selected = false,
  disabled = false,
  onClick,
  className,
}: FilterChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "focus-ring inline-flex items-center rounded-full border px-3.5 py-1.5 text-label text-foreground transition-colors",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface text-foreground enabled:hover:border-border-strong enabled:hover:bg-muted",
        disabled && "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      {label}
    </button>
  );
}
