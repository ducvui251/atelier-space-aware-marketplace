import type { ArtworkOrientation } from "@/types";
import { cn } from "@/lib/utils";

interface ArtworkMetadataProps {
  widthCm: number;
  heightCm: number;
  medium: string;
  year: number;
  orientation: ArtworkOrientation;
  className?: string;
}

export function ArtworkMetadata({
  widthCm,
  heightCm,
  medium,
  year,
  className,
}: ArtworkMetadataProps) {
  const dims = `${widthCm} × ${heightCm} cm`;
  return (
    <div
      className={cn(
        "flex flex-col gap-1 text-caption text-muted-foreground",
        className,
      )}
    >
      <p>{dims}</p>
      <p className="capitalize">{medium}</p>
      {year ? <p>{year}</p> : null}
    </div>
  );
}
