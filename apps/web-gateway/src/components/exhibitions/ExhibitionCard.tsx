import Link from "next/link";
import type { Exhibition } from "@atelier/contracts";
import { ArtworkImage } from "@/components/artwork/ArtworkImage";
import { Button } from "@/components/ui/button";

interface ExhibitionCardProps {
  exhibition: Exhibition;
  /** Resolved by the caller (artwork data lives in artist-artwork, not room-preview). */
  previewImageUrl?: string;
}

export function ExhibitionCard({ exhibition, previewImageUrl }: ExhibitionCardProps) {
  const href = `/exhibitions/${exhibition.slug}`;
  const count = exhibition.artworkCount;

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border bg-surface">
      <Link href={href} className="group focus-ring relative block aspect-[4/3] w-full overflow-hidden bg-muted">
        <ArtworkImage
          src={previewImageUrl ?? ""}
          alt={exhibition.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-normal group-hover:scale-[1.02]"
        />
      </Link>
      <div className="flex flex-col gap-1 p-5">
        <h3 className="font-display text-h3 text-foreground">{exhibition.title}</h3>
        <p className="text-body-sm text-muted-foreground">
          {count} {count === 1 ? "artwork" : "artworks"}
        </p>
        {exhibition.description ? (
          <p className="mt-1 line-clamp-2 text-body-sm text-muted-foreground">{exhibition.description}</p>
        ) : null}
        <Button asChild variant="outline" size="sm" className="mt-3 w-fit">
          <Link href={href}>Enter Exhibition</Link>
        </Button>
      </div>
    </div>
  );
}
