import Link from "next/link";
import Image from "next/image";
import { ShieldCheck } from "lucide-react";
import type { Artwork } from "@/types";
import { cn } from "@/lib/utils";
import { artworkAspect } from "@/lib/artwork-aspect";
import { PriceDisplay } from "./PriceDisplay";
import { SaveButton } from "./SaveButton";

interface ArtworkCardProps {
  artwork: Artwork;
  priority?: boolean;
  className?: string;
}

export function ArtworkCard({ artwork, priority, className }: ArtworkCardProps) {
  const verified = artwork.verificationStatus === "verified";

  return (
    <Link
      href={`/artworks/${artwork.id}`}
      className={cn(
        "group focus-ring flex flex-col rounded-lg",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-muted",
          artworkAspect(artwork.orientation),
        )}
      >
        <Image
          src={artwork.imageUrl}
          alt={artwork.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="object-cover transition-transform duration-normal [transition-timing-function:var(--ease-out)] group-hover:scale-[1.02]"
          priority={priority}
        />
        <SaveButton />
      </div>

      <div className="mt-4 flex flex-col gap-0.5">
        <h3 className="font-display text-h3 text-foreground">{artwork.title}</h3>
        <p className="text-body-sm text-muted-foreground">{artwork.artist}</p>
        <div className="mt-1.5">
          <PriceDisplay price={artwork.price} currency={artwork.currency} />
        </div>
        <p className="mt-1 text-caption text-subdued">
          {artwork.widthCm} × {artwork.heightCm} cm
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-caption text-muted-foreground">
          <span className="capitalize">
            {artwork.editionType === "original" ? "Original" : "Limited edition"}
          </span>
          <span aria-hidden>·</span>
          <span
            className={cn(
              "inline-flex items-center gap-1",
              verified ? "text-success-foreground" : "text-warning-foreground",
            )}
          >
            {verified ? <ShieldCheck className="size-3.5" /> : null}
            {verified ? "Verified" : "Pending review"}
          </span>
        </div>
      </div>
    </Link>
  );
}
