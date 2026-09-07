import Link from "next/link";

const moods = [
  { label: "Abstract", className: "bg-accent-soft text-accent-foreground" },
  { label: "Minimal", className: "bg-surface-strong text-foreground" },
  { label: "Gestural", className: "bg-primary text-primary-foreground" },
  { label: "Photography", className: "bg-muted text-foreground" },
  { label: "Interior", className: "bg-border text-foreground" },
  { label: "Monochrome", className: "bg-foreground text-background" },
];

export function StyleTiles() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {moods.map((mood) => (
        <Link
          key={mood.label}
          href="/artworks"
          className={`focus-ring flex aspect-[4/5] flex-col items-center justify-center gap-1 rounded-lg transition-transform duration-normal hover:-translate-y-1 ${mood.className}`}
        >
          <span className="font-display text-h3">{mood.label}</span>
        </Link>
      ))}
    </div>
  );
}
