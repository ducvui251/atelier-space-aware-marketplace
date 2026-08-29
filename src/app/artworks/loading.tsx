import { PageContainer } from "@/components/layout/PageContainer";
import { Skeleton } from "@/components/ui/skeleton";
import { ArtworkGridSkeleton } from "@/components/artwork/ArtworkGrid";

export default function ArtworksLoading() {
  return (
    <PageContainer className="py-10">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="mt-5 h-10 w-full max-w-xl" />
      <Skeleton className="mt-3 h-10 w-full max-w-md" />
      <div className="mt-8">
        <ArtworkGridSkeleton count={6} />
      </div>
    </PageContainer>
  );
}
