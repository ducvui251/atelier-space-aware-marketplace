import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const gridVariants = cva("grid gap-x-6 gap-y-10", {
  variants: {
    columns: {
      1: "grid-cols-1",
      2: "grid-cols-1 sm:grid-cols-2",
      3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
      4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
      gallery:
        "grid-cols-1 gap-y-12 sm:grid-cols-2 gap-x-8 lg:grid-cols-3 lg:gap-x-10",
    },
  },
  defaultVariants: {
    columns: 3,
  },
});

export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {}

export function Grid({ className, columns, ...props }: GridProps) {
  return (
    <div className={cn(gridVariants({ columns }), className)} {...props} />
  );
}
