"use client";

import Link from "next/link";
import type { Artwork } from "@atelier/contracts";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/lib/utils";

interface ArtworkDetailSheetProps {
  artwork: Artwork | null;
  onClose: () => void;
}

const AVAILABILITY_VARIANT: Record<Artwork["availability"], "success" | "warning" | "destructive"> = {
  available: "success",
  reserved: "warning",
  sold: "destructive",
};

/**
 * Phase 4 artwork interaction panel: opened by clicking a hovered artwork in
 * the exhibition, closing resumes player movement (see ExhibitionDemoScene).
 */
export function ArtworkDetailSheet({ artwork, onClose }: ArtworkDetailSheetProps) {
  return (
    <Sheet open={artwork !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent>
        {artwork ? (
          <>
            <SheetTitle>{artwork.title}</SheetTitle>
            <p className="text-body-sm text-muted-foreground">{artwork.artist}</p>

            <Badge variant={AVAILABILITY_VARIANT[artwork.availability]} className="w-fit capitalize">
              {artwork.availability}
            </Badge>

            {artwork.description ? (
              <p className="text-body-sm text-muted-foreground">{artwork.description}</p>
            ) : null}

            <dl className="flex flex-col gap-3 text-body-sm">
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Dimensions</dt>
                <dd className="text-foreground">
                  {artwork.widthCm} × {artwork.heightCm} cm
                </dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Medium</dt>
                <dd className="text-foreground">{artwork.medium}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-muted-foreground">Price</dt>
                <dd className="text-foreground">{formatPrice(artwork.price, artwork.currency)}</dd>
              </div>
            </dl>

            <div className="mt-2 flex flex-col gap-2">
              <Button asChild>
                <Link href={`/artworks/${artwork.id}`}>View artwork</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/artists/${artwork.artistId}`}>View artist</Link>
              </Button>
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
