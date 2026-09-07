import { formatPrice } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface PriceDisplayProps {
  price: number;
  currency: string;
  className?: string;
}

export function PriceDisplay({ price, currency, className }: PriceDisplayProps) {
  return (
    <span className={cn("text-price font-medium text-foreground", className)}>
      {formatPrice(price, currency)}
    </span>
  );
}
