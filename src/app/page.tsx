import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { StyleTiles } from "@/components/home/StyleTiles";
import { SpaceTeaser } from "@/components/home/SpaceTeaser";
import { EditorialBand } from "@/components/home/EditorialBand";
import { Section } from "@/components/layout/Section";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { PageContainer } from "@/components/layout/PageContainer";
import { Grid } from "@/components/layout/Grid";
import { ArtworkCard } from "@/components/artwork/ArtworkCard";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { CollectionCard } from "@/components/collection/CollectionCard";
import { FilterChip } from "@/components/discovery/FilterChip";
import { Button } from "@/components/ui/button";
import { artists, collections } from "@/data";
import { getFeaturedArtworks } from "@/features/artworks/services/artwork.service";

export default async function HomePage() {
  const featured = await getFeaturedArtworks();

  return (
    <>
      <Hero />

      {/* Popular starting points */}
      <Section spacing="compact">
        <PageContainer>
          <SectionHeader
            eyebrow="Discover"
            title="Browse what you love"
            description="Quick starting points for your search."
          />
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <FilterChip label="Abstract" selected />
            <FilterChip label="Painting" selected />
            <FilterChip label="Photography" />
            <FilterChip label="Under $500" />
            <FilterChip label="Large" disabled />
          </div>
        </PageContainer>
      </Section>

      {/* Featured artworks */}
      <Section spacing="generous">
        <PageContainer>
          <SectionHeader
            eyebrow="Featured"
            title="Works worth a second look"
            description="A small, considered selection from right now."
            action={
              <Button variant="ghost" asChild>
                <Link href="/artworks">
                  View all
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
          <Grid columns={3} className="mt-10">
            {featured.map((artwork, idx) => (
              <ArtworkCard key={artwork.id} artwork={artwork} priority={idx < 3} />
            ))}
          </Grid>
        </PageContainer>
      </Section>

      {/* Browse by mood */}
      <Section spacing="compact">
        <PageContainer>
          <SectionHeader
            eyebrow="Browse"
            title="Browse by mood"
            description="Start with a feeling, refine by space and budget."
          />
          <div className="mt-10">
            <StyleTiles />
          </div>
        </PageContainer>
      </Section>

      {/* Curated collections */}
      <Section id="collections" spacing="generous">
        <PageContainer>
          <SectionHeader
            eyebrow="Collections"
            title="Curated collections"
            description="Hand-picked groupings by a small editorial team."
            action={
              <Button variant="ghost" asChild>
                <Link href="/artworks">
                  Explore
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
          <Grid columns={4} className="mt-10">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </Grid>
        </PageContainer>
      </Section>

      {/* Art for your space */}
      <Section spacing="compact">
        <PageContainer>
          <SpaceTeaser />
        </PageContainer>
      </Section>

      {/* Featured artists */}
      <Section spacing="generous">
        <PageContainer>
          <SectionHeader
            eyebrow="Artists"
            title="Meet the artists"
            description="Working artists whose studios and stories we trust."
            action={
              <Button variant="ghost" asChild>
                <Link href="/artists">
                  All artists
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
            }
          />
          <Grid columns={2} className="mt-10 lg:grid-cols-3">
            {artists.slice(0, 3).map((artist) => (
              <ArtistCard key={artist.id} artist={artist} />
            ))}
          </Grid>
        </PageContainer>
      </Section>

      {/* Editorial */}
      <Section spacing="compact">
        <PageContainer>
          <EditorialBand />
        </PageContainer>
      </Section>
    </>
  );
}
