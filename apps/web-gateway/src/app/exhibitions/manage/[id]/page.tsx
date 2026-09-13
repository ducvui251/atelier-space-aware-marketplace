import { ExhibitionBuilder } from "@/components/exhibitions/ExhibitionBuilder";
import { RequireRole } from "@/components/auth/RequireRole";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function ExhibitionBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <PageContainer className="py-8">
      <RequireRole role={["artist", "admin"]}>
        <ExhibitionBuilder id={id} />
      </RequireRole>
    </PageContainer>
  );
}
