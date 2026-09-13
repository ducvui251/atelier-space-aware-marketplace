import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Section } from "@/components/layout/Section";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Grid } from "@/components/layout/Grid";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { ArtworkImage } from "@/components/artwork/ArtworkImage";
import { Badge } from "@/components/ui/badge";
import { FollowButton } from "@/components/artist/FollowButton";
import { ExhibitionCard } from "@/components/exhibitions/ExhibitionCard";
import { findArtist, findArtwork, listArtworks } from "@/lib/gateway/clients/artwork.client";
import { listPublishedExhibitionsByCreator } from "@/lib/gateway/clients/exhibition.client";
import { displayableImageUrl } from "@/lib/image-hosts";

interface ArtistProfileProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: ArtistProfileProps): Promise<Metadata> {
  const { id } = await params;
  const artist = await findArtist(id);
  return {
    title: artist ? artist.displayName : "Artist",
    description: artist?.bio,
  };
}

export default async function ArtistProfilePage({
  params,
}: ArtistProfileProps) {
  const { id } = await params;
  const artist = await findArtist(id);
  if (!artist) notFound();

  const [allArtworks, exhibitions] = await Promise.all([
    listArtworks(),
    // Exhibitions are a secondary section — a room-preview outage must not
    // take down the whole artist profile.
    listPublishedExhibitionsByCreator(artist.id).catch(() => []),
  ]);
  const works = allArtworks.filter((a) => a.artistId === artist.id);
  const previewImageUrls = await Promise.all(
    exhibitions.map(async (exhibition) =>
      exhibition.previewArtworkId
        ? displayableImageUrl((await findArtwork(exhibition.previewArtworkId).catch(() => null))?.imageUrl)
        : "",
    ),
  );

  return (
    <>
      <PageContainer className="py-10">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          {/* Portrait */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted lg:sticky lg:top-24 lg:self-start">
            <ArtworkImage
              src={artist.imageUrl}
              alt={`Portrait of ${artist.displayName}`}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-cover"
            />
          </div>

          {/* Bio */}
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-display text-h1 text-foreground">
                {artist.displayName}
              </h1>
              {artist.verificationStatus === "verified" ? (
                <Badge variant="success">Verified artist</Badge>
              ) : (
                <Badge variant="warning">Verification pending</Badge>
              )}
            </div>
            <p className="mt-3 inline-flex items-center gap-1.5 text-body text-muted-foreground">
              <MapPin className="size-4" />
              {artist.location} · {artist.nationality}
            </p>
            <div className="mt-4">
              <FollowButton artistId={artist.id} />
            </div>
            <p className="mt-6 text-body-lg text-muted-foreground text-balance">
              {artist.bio}
            </p>

            <div className="mt-8">
              <h2 className="font-display text-h2 text-foreground">About</h2>
              <p className="mt-3 text-body text-muted-foreground">
                {artist.displayName} works from a studio in {artist.location},
                producing {artist.nationality.toLowerCase()}-born work with a
                patient, observation-first eye. Their practice moves between
                canvas, paper, and print.
              </p>
            </div>

          </div>
        </div>
      </PageContainer>

      {exhibitions.length > 0 ? (
        <Section spacing="generous" className="border-t border-border">
          <PageContainer>
            <SectionHeader
              eyebrow="Exhibitions"
              title={`Exhibitions by ${artist.displayName}`}
              description="Walk through the artist's curated 3D shows."
            />
            <Grid columns={3} className="mt-10">
              {exhibitions.map((exhibition, index) => (
                <ExhibitionCard
                  key={exhibition.id}
                  exhibition={exhibition}
                  previewImageUrl={previewImageUrls[index]}
                />
              ))}
            </Grid>
          </PageContainer>
        </Section>
      ) : null}

      {works.length > 0 ? (
        <Section spacing="generous">
          <PageContainer>
            <SectionHeader
              eyebrow="Works"
              title={`Artworks by ${artist.displayName}`}
            />
            <Grid columns={3} className="mt-10">
              {works.map((artwork) => (
                <ArtworkCard key={artwork.id} artwork={artwork} />
              ))}
            </Grid>
          </PageContainer>
        </Section>
      ) : null}
    </>
  );
}
