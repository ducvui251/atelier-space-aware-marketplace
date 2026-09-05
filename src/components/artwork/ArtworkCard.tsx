"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import type { Artwork } from "@/types";
import { cn } from "@/lib/utils";
import { artworkAspect } from "@/lib/artwork-aspect";
import { useAppState, useSaved } from "@/lib/store/hooks";
import { PriceDisplay } from "./PriceDisplay";
import { SaveButton } from "./SaveButton";

interface ArtworkCardProps {
  artwork: Artwork;
  priority?: boolean;
  className?: string;
}

export function ArtworkCard({ artwork, priority, className }: ArtworkCardProps) {
  const router = useRouter();
  const { db, currentUser } = useAppState();
  const { isSaved, toggleSaved } = useSaved();
  const live = db.artworks.find((a) => a.id === artwork.id) ?? artwork;
  const verified = live.verificationStatus === "verified";
  const unavailable = live.availability !== "available";

  function handleSaveToggle() {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    toggleSaved(live.id);
  }

  return (
    <Link
      href={`/artworks/${live.id}`}
      className={cn(
        "group focus-ring flex flex-col rounded-lg",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden rounded-lg bg-muted",
          artworkAspect(live.orientation),
        )}
      >
        <Image
          src={live.imageUrl}
          alt={live.title}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className={cn(
            "object-cover transition-transform duration-normal [transition-timing-function:var(--ease-out)] group-hover:scale-[1.02]",
            unavailable && "opacity-70 grayscale-[35%]",
          )}
          priority={priority}
        />
        <SaveButton saved={isSaved(live.id)} onToggle={handleSaveToggle} />
        {unavailable ? (
          <span className="absolute left-3 top-3 rounded-full bg-foreground/85 px-2.5 py-1 text-metadata font-medium capitalize text-background">
            {live.availability}
          </span>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-0.5">
        <h3 className="font-display text-h3 text-foreground">{live.title}</h3>
        <p className="text-body-sm text-muted-foreground">{live.artist}</p>
        <div className="mt-1.5">
          <PriceDisplay price={live.price} currency={live.currency} />
        </div>
        <p className="mt-1 text-caption text-subdued">
          {live.widthCm} × {live.heightCm} cm
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-caption text-muted-foreground">
          <span className="capitalize">
            {live.editionType === "original" ? "Original" : "Limited edition"}
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
