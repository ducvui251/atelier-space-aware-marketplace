import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { Grid } from "@/components/layout/Grid";
import { ArtistCard } from "@/components/artist/ArtistCard";
import { artists } from "@/data";

export const metadata: Metadata = {
  title: "Artists",
  description:
    "Explore the working artists behind the platform, with verified profiles and studio work.",
};

export default function ArtistsPage() {
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
      <Grid columns={3} className="mt-10">
        {artists.map((artist) => (
          <ArtistCard key={artist.id} artist={artist} />
        ))}
      </Grid>
    </PageContainer>
  );
}
