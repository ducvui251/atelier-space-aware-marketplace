"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  FileCheck,
  Heart,
  ShieldCheck,
  ShoppingBag,
  Sofa,
  Truck,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Section } from "@/components/layout/Section";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Grid } from "@/components/layout/Grid";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { ArtworkImage } from "@/components/artwork/ArtworkImage";
import { PriceDisplay } from "@/components/artwork/PriceDisplay";
import { VerificationBadge } from "@/components/artwork/VerificationBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn, formatPrice } from "@/lib/utils";
import { artworkAspect } from "@/lib/artwork-aspect";
import { useAuth, useCart, useSaved } from "@/lib/client/hooks";
import type { Artist, Artwork } from "@/types";

interface ArtworkDetailClientProps {
  artwork: Artwork;
  artist: Artist | null;
  related: Artwork[];
}

export function ArtworkDetailClient({ artwork, artist, related }: ArtworkDetailClientProps) {
  const router = useRouter();
  const lastViewedArtworkId = useRef<string | null>(null);
  const { currentUser } = useAuth();
  const { cartArtworkIds, addToCart } = useCart();
  const { isSaved, toggleSaved } = useSaved();

  const available = artwork.availability === "available";
  const inCart = cartArtworkIds.includes(artwork.id);
  const saved = isSaved(artwork.id);

  useEffect(() => {
    if (lastViewedArtworkId.current === artwork.id) return;
    lastViewedArtworkId.current = artwork.id;
    void fetch(`/api/artworks/${encodeURIComponent(artwork.id)}/view`, {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    }).catch(() => {
      // View tracking is best-effort and must not block the artwork page.
    });
  }, [artwork.id]);

  function requireAuth(action: () => void) {
    if (!currentUser) {
      router.push("/login");
      return;
    }
    action();
  }

  return (
    <>
      <PageContainer className="py-8">
        <Link
          href="/artworks"
          className="focus-ring inline-flex items-center gap-2 text-body-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Back to artworks
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
          {/* Image */}
          <div className="lg:sticky lg:top-24 lg:self-start">
            <div
              className={cn(
                "relative w-full overflow-hidden rounded-xl bg-muted",
                artworkAspect(artwork.orientation),
              )}
            >
              <ArtworkImage
                src={artwork.imageUrl}
                alt={`${artwork.title} by ${artwork.artist}`}
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                className="object-cover"
              />
            </div>
          </div>

          {/* Purchase / details panel */}
          <div>
            <VerificationBadge
              verificationStatus={artwork.verificationStatus}
              editionType={artwork.editionType}
            />
            <h1 className="mt-4 font-display text-h1 text-foreground">{artwork.title}</h1>
            <Link
              href={`/artists/${artwork.artistId}`}
              className="focus-ring inline-flex items-center gap-1.5 rounded-sm text-body text-muted-foreground transition-colors hover:text-foreground"
            >
              {artwork.artist}
              {artist?.verificationStatus === "verified" ? (
                <BadgeCheck className="size-4 text-success-foreground" aria-label="Verified artist" />
              ) : null}
            </Link>

            <div className="mt-5 flex items-baseline gap-3">
              <PriceDisplay price={artwork.price} currency={artwork.currency} className="text-h3" />
              <Badge variant={available ? "neutral" : "warning"} className="capitalize">
                {artwork.availability}
              </Badge>
            </div>

            <dl className="mt-6 grid grid-cols-2 gap-y-3 border-y border-border py-5 text-body-sm">
              <MetaLabel label="Medium" value={artwork.medium} />
              <MetaLabel label="Dimensions" value={`${artwork.widthCm} × ${artwork.heightCm} cm`} />
              <MetaLabel label="Year" value={String(artwork.year)} />
              <MetaLabel
                label="Edition"
                value={artwork.editionType === "original" ? "Original" : "Limited edition"}
              />
            </dl>

            <p className="mt-6 text-body text-muted-foreground">
              {artwork.description ??
                `${artwork.title} is a ${artwork.medium.toLowerCase()} work in a ${artwork.style
                  .join(", ")
                  .toLowerCase()} style, with a palette of ${artwork.dominantColors
                  .join(", ")
                  .toLowerCase()}.`}
            </p>

            <div className="mt-8 flex flex-col gap-3">
              {available ? (
                <>
                  <Button
                    size="lg"
                    className="w-full"
                    onClick={() =>
                      requireAuth(() => {
                        addToCart(artwork.id);
                        router.push("/checkout");
                      })
                    }
                  >
                    Purchase — {formatPrice(artwork.price, artwork.currency)}
                  </Button>
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      disabled={inCart}
                      onClick={() => requireAuth(() => addToCart(artwork.id))}
                    >
                      <ShoppingBag className="size-4" />
                      {inCart ? "In cart" : "Add to cart"}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => requireAuth(() => toggleSaved(artwork.id))}
                    >
                      <Heart className={cn("size-4", saved && "fill-current text-destructive")} />
                      {saved ? "Saved" : "Save"}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-lg border border-warning bg-warning-soft px-4 py-3 text-body-sm text-warning-foreground">
                  This artwork is now {artwork.availability === "sold" ? "sold" : "reserved"}.
                  {related.length > 0 ? " See similar artworks below." : ""}
                </div>
              )}
              <Button asChild variant="outline" size="default">
                <Link href={`/rooms?artwork=${artwork.id}`}>
                  <Sofa className="size-4" />
                  View in your room
                </Link>
              </Button>
            </div>

            <div className="mt-8 space-y-4 rounded-lg border border-border bg-surface p-5">
              <InfoRow icon={<Truck className="size-4" />} title="Shipping">
                Ships in 3–5 business days from {artist?.location ?? "the studio"}. Insured,
                tracked, and framed-to-order.
              </InfoRow>
              <InfoRow icon={<ShieldCheck className="size-4" />} title="Authenticity">
                {artwork.verificationStatus === "verified"
                  ? "Includes a signed Certificate of Authenticity and verified artist profile."
                  : "Artist verification in progress. COA to follow on completion."}
              </InfoRow>
              {artwork.coaUrl ? (
                <InfoRow icon={<FileCheck className="size-4" />} title="Certificate of Authenticity">
                  <a
                    href={artwork.coaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="focus-ring underline underline-offset-2 hover:text-foreground"
                  >
                    View COA document
                  </a>
                </InfoRow>
              ) : null}
            </div>
          </div>
        </div>
      </PageContainer>

      {/* Artist preview */}
      {artist ? (
        <Section spacing="compact">
          <PageContainer>
            <div className="grid items-center gap-8 rounded-xl border border-border bg-surface p-8 md:grid-cols-[auto_1fr_auto] md:p-10">
              <div className="relative size-24 overflow-hidden rounded-full bg-muted md:size-28">
                <ArtworkImage
                  src={artist.imageUrl}
                  alt={`Portrait of ${artist.displayName}`}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="eyebrow">About the artist</p>
                <h2 className="mt-2 font-display text-h2 text-foreground">{artist.displayName}</h2>
                <p className="mt-2 line-clamp-3 text-body text-muted-foreground">{artist.bio}</p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/artists/${artist.id}`}>View profile</Link>
              </Button>
            </div>
          </PageContainer>
        </Section>
      ) : null}

      {/* Related */}
      {related.length > 0 ? (
        <Section spacing="generous">
          <PageContainer>
            <SectionHeader
              eyebrow="Related"
              title="You may also like"
              description="Works that share a similar voice."
            />
            <Grid columns={3} className="mt-10">
              {related.map((relatedArtwork) => (
                <ArtworkCard key={relatedArtwork.id} artwork={relatedArtwork} />
              ))}
            </Grid>
          </PageContainer>
        </Section>
      ) : null}
    </>
  );
}

function MetaLabel({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-caption text-subdued">{label}</dt>
      <dd className="mt-0.5 text-body-sm text-foreground">{value}</dd>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 shrink-0 text-primary">{icon}</span>
      <div>
        <p className="text-body-sm font-medium text-foreground">{title}</p>
        <p className="mt-0.5 text-body-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
