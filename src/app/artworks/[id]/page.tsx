import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  Heart,
  ShieldCheck,
  Sofa,
  Truck,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Section } from "@/components/layout/Section";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Grid } from "@/components/layout/Grid";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { PriceDisplay } from "@/components/artwork/PriceDisplay";
import { VerificationBadge } from "@/components/artwork/VerificationBadge";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { artists } from "@/data";
import { cn, formatPrice } from "@/lib/utils";
import { artworkAspect } from "@/lib/artwork-aspect";
import {
  getArtworkById,
  getArtworks,
} from "@/features/artworks/services/artwork.service";

interface ArtworkDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  const artworks = await getArtworks();
  return artworks.map((artwork) => ({ id: artwork.id }));
}

export async function generateMetadata({
  params,
}: ArtworkDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const artwork = await getArtworkById(id);
  return {
    title: artwork ? artwork.title : "Artwork",
    description: artwork
      ? `${artwork.title} by ${artwork.artist}. ${artwork.medium}.`
      : undefined,
  };
}

export default async function ArtworkDetailPage({
  params,
}: ArtworkDetailPageProps) {
  const { id } = await params;
  const artwork = await getArtworkById(id);
  if (!artwork) notFound();

  const artist = artists.find((a) => a.id === artwork.artistId);
  const all = await getArtworks();
  const related = all
    .filter((a) => a.id !== artwork.id && a.style[0] === artwork.style[0])
    .slice(0, 3);

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
              <Image
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
            <h1 className="mt-4 font-display text-h1 text-foreground">
              {artwork.title}
            </h1>
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
              <PriceDisplay
                price={artwork.price}
                currency={artwork.currency}
                className="text-h3"
              />
              <Badge variant="neutral" className="capitalize">
                {artwork.availability === "available"
                  ? "Available"
                  : artwork.availability}
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
              {artwork.title} is a {artwork.medium.toLowerCase()} work in a{" "}
              {artwork.style.join(", ").toLowerCase()} style, with a palette of{" "}
              {artwork.dominantColors.join(", ").toLowerCase()}. It would sit
              quietly above a sofa or in a bedroom, drawing light without
              shouting for attention.
            </p>

            <div className="mt-8 flex flex-col gap-3">
              <Button size="lg" className="w-full">
                Purchase — {formatPrice(artwork.price, artwork.currency)}
              </Button>
              <div className="grid grid-cols-2 gap-3">
                <Button asChild variant="outline" size="default">
                  <Link href="/rooms">
                    <Sofa className="size-4" />
                    View in your room
                  </Link>
                </Button>
                <Button variant="ghost" size="default" type="button">
                  <Heart className="size-4" />
                  Save
                </Button>
              </div>
            </div>

            <div className="mt-8 space-y-4 rounded-lg border border-border bg-surface p-5">
              <InfoRow icon={<Truck className="size-4" />} title="Shipping">
                Ships in 3–5 business days from {artist?.location ?? "the studio"}.
                Insured, tracked, and framed-to-order.
              </InfoRow>
              <InfoRow icon={<ShieldCheck className="size-4" />} title="Authenticity">
                {artwork.verificationStatus === "verified"
                  ? "Includes a signed Certificate of Authenticity and verified artist profile."
                  : "Artist verification in progress. COA to follow on completion."}
              </InfoRow>
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
                <Image
                  src={artist.imageUrl}
                  alt={`Portrait of ${artist.displayName}`}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              </div>
              <div>
                <p className="eyebrow">About the artist</p>
                <h2 className="mt-2 font-display text-h2 text-foreground">
                  {artist.displayName}
                </h2>
                <p className="mt-2 line-clamp-3 text-body text-muted-foreground">
                  {artist.bio}
                </p>
              </div>
              <Button asChild variant="outline">
                <Link href={`/artists/${artist.id}`}>
                  View profile
                </Link>
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
              {related.map((artwork) => (
                <ArtworkCard key={artwork.id} artwork={artwork} />
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
