import type { Artwork } from "@/types";
import { Grid } from "@/components/layout/Grid";
import { ArtworkCard } from "./ArtworkCard";
import { Skeleton } from "@/components/ui/skeleton";

interface ArtworkGridProps {
  artworks: Artwork[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function ArtworkGrid({
  artworks,
  columns = 3,
  className,
}: ArtworkGridProps) {
  return (
    <Grid columns={columns} className={className}>
      {artworks.map((artwork, idx) => (
        <ArtworkCard key={artwork.id} artwork={artwork} priority={idx < 3} />
      ))}
    </Grid>
  );
}

export function ArtworkGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <Grid columns={3}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="aspect-[9/11] w-full rounded-lg" />
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
      ))}
    </Grid>
  );
}
