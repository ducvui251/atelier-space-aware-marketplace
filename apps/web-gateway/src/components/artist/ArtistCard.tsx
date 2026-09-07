import Link from "next/link";
import Image from "next/image";
import { BadgeCheck } from "lucide-react";
import type { Artist } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ArtistCardProps {
  artist: Artist;
  className?: string;
}

export function ArtistCard({ artist, className }: ArtistCardProps) {
  const verified = artist.verificationStatus === "verified";

  return (
    <Link
      href={`/artists/${artist.id}`}
      className={cn("group focus-ring flex flex-col gap-3", className)}
    >
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg bg-muted">
        <Image
          src={artist.imageUrl}
          alt={`Portrait of ${artist.displayName}`}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-normal [transition-timing-function:var(--ease-out)] group-hover:scale-[1.02]"
        />
      </div>
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1.5">
          <h3 className="font-display text-h3 text-foreground">
            {artist.displayName}
          </h3>
          {verified ? (
            <BadgeCheck className="size-4 text-success-foreground" aria-label="Verified artist" />
          ) : (
            <Badge variant="warning" className="px-2 py-0.5">
              Pending
            </Badge>
          )}
        </div>
        <p className="text-body-sm text-muted-foreground">{artist.location}</p>
      </div>
    </Link>
  );
}
