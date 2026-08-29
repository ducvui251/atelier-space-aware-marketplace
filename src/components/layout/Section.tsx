import { cn } from "@/lib/utils";

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  spacing?: "compact" | "default" | "generous";
}

export function Section({
  className,
  spacing = "default",
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(
        "py-12 md:py-16 lg:py-20",
        spacing === "compact" && "py-8 md:py-10",
        spacing === "generous" && "py-16 md:py-24 lg:py-28",
        className,
      )}
      {...props}
    />
  );
}
