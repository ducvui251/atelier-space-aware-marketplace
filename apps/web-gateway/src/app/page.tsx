import Link from "next/link";
import { ArrowRight, ImageOff } from "lucide-react";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { listCollections } from "@/lib/gateway/clients/catalog.client";
import { listArtists, listFeaturedArtworks } from "@/lib/gateway/clients/artwork.client";
import type { Artist, Artwork, Collection } from "@/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, collections, artists] = await Promise.all([
    listFeaturedArtworks().catch(() => [] as Artwork[]),
    listCollections().catch(() => [] as Collection[]),
    listArtists().catch(() => [] as Artist[]),
  ]);

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
            <FilterChipAsLink label="Abstract" href="/artworks?style=Abstract" />
            <FilterChipAsLink label="Minimal" href="/artworks?style=Minimal" />
            <FilterChipAsLink label="Photography" href="/artworks?style=Photography" />
            <FilterChipAsLink label="Under $700" href="/artworks?price=under-700" />
            <FilterChipAsLink label="Limited edition" href="/artworks?edition=limited-edition" />
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
          {featured.length > 0 ? (
            <Grid columns={3} className="mt-10">
              {featured.map((artwork, idx) => (
                <ArtworkCard key={artwork.id} artwork={artwork} priority={idx < 3} />
              ))}
            </Grid>
          ) : (
            <EmptyState
              icon={ImageOff}
              className="mt-10"
              title="No featured works yet"
              description="The catalog is being prepared. Please check back soon."
              action={
                <Button variant="outline" asChild>
                  <Link href="/artworks">Browse the catalog</Link>
                </Button>
              }
            />
          )}
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
          {collections.length > 0 ? (
            <Grid columns={4} className="mt-10">
              {collections.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </Grid>
          ) : (
            <EmptyState
              icon={ImageOff}
              className="mt-10"
              title="No collections yet"
              description="Curated collections will appear here once the editorial team publishes them."
            />
          )}
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
          {artists.length > 0 ? (
            <Grid columns={2} className="mt-10 lg:grid-cols-3">
              {artists.slice(0, 3).map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </Grid>
          ) : (
            <EmptyState
              icon={ImageOff}
              className="mt-10"
              title="No artists yet"
              description="Artist profiles will appear here as they join the platform."
            />
          )}
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

function FilterChipAsLink({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="focus-ring inline-flex items-center rounded-full border border-border bg-surface px-3.5 py-1.5 text-label text-foreground transition-colors hover:border-border-strong hover:bg-muted"
    >
      {label}
    </Link>
  );
}
