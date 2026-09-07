import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  align?: "left" | "center";
  className?: string;
}

export function SectionHeader({
  eyebrow,
  title,
  description,
  action,
  align = "left",
  className,
}: SectionHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3",
        align === "center" && "items-center text-center",
        className,
      )}
    >
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <h2 className="text-h2 font-display text-foreground text-balance">
          {title}
        </h2>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description ? (
        <p className="max-w-2xl text-body text-muted-foreground text-balance">
          {description}
        </p>
      ) : null}
    </div>
  );
}
