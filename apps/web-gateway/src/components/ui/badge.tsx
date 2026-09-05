import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-metadata font-medium leading-none transition-colors",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        outline: "border border-border-strong bg-transparent text-foreground",
        accent: "bg-accent-soft text-accent-foreground",
        success: "bg-success-soft text-success-foreground",
        warning: "bg-warning-soft text-warning-foreground",
        destructive: "bg-destructive-soft text-destructive-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
