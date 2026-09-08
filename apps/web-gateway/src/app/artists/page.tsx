import type { Metadata } from "next";
import { Users } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { Grid } from "@/components/layout/Grid";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { EmptyState } from "@/components/ui/empty-state";
import { listArtists } from "@/lib/gateway/clients/artwork.client";
import type { Artist } from "@/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Artists",
  description:
    "Explore the working artists behind the platform, with verified profiles and studio work.",
};

export default async function ArtistsPage() {
  const artists = await listArtists().catch(() => [] as Artist[]);

  return (
    <PageContainer className="py-10">
      <p className="eyebrow">Artists</p>
      <h1 className="mt-2 font-display text-h1 text-foreground">
        The makers
      </h1>
      <p className="mt-4 max-w-xl text-body text-muted-foreground">
        A growing roster of working artists whose practices we verify and
        trust.
      </p>
      {artists.length > 0 ? (
        <Grid columns={3} className="mt-10">
          {artists.map((artist) => (
            <ArtistCard key={artist.id} artist={artist} />
          ))}
        </Grid>
      ) : (
        <EmptyState
          icon={Users}
          className="mt-10"
          title="No artists yet"
          description="Artist profiles will appear here as they join the platform."
        />
      )}
    </PageContainer>
  );
}
