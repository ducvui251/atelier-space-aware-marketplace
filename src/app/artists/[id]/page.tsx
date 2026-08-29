import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { MapPin } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Section } from "@/components/layout/Section";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Grid } from "@/components/layout/Grid";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { Badge } from "@/components/ui/badge";
import { artists } from "@/data";
import { getArtworks } from "@/features/artworks/services/artwork.service";

interface ArtistProfileProps {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return artists.map((artist) => ({ id: artist.id }));
}

export async function generateMetadata({
  params,
}: ArtistProfileProps): Promise<Metadata> {
  const { id } = await params;
  const artist = artists.find((a) => a.id === id);
  return {
    title: artist ? artist.displayName : "Artist",
    description: artist?.bio,
  };
}

const exhibitions = [
  "Group show — Light & Matter, Copenhagen, 2024",
  "Solo — The Quiet Wall, Paris, 2023",
  "Fair — Contemporary Art Week, London, 2022",
];

export default async function ArtistProfilePage({
  params,
}: ArtistProfileProps) {
  const { id } = await params;
  const artist = artists.find((a) => a.id === id);
  if (!artist) notFound();

  const works = (await getArtworks()).filter((a) => a.artistId === artist.id);

  return (
    <>
      <PageContainer className="py-10">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          {/* Portrait */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted lg:sticky lg:top-24 lg:self-start">
            <Image
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

            <div className="mt-8">
              <h2 className="font-display text-h2 text-foreground">
                Selected exhibitions
              </h2>
              <ul className="mt-4 space-y-3 border-l border-border pl-5">
                {exhibitions.map((exhibition) => (
                  <li key={exhibition} className="text-body-sm text-muted-foreground">
                    {exhibition}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </PageContainer>

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
