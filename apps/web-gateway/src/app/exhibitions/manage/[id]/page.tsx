import { ExhibitionWorkspace } from "@/components/exhibitions/ExhibitionWorkspace";
import { RequireRole } from "@/components/auth/RequireRole";
import { RequireVerifiedArtist } from "@/components/auth/RequireVerifiedArtist";
import { PageContainer } from "@/components/layout/PageContainer";

export default async function ExhibitionEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return (
    <PageContainer className="max-w-none px-4 py-4 sm:px-6">
      <RequireRole role={["artist", "admin"]}>
        <RequireVerifiedArtist>
          <ExhibitionWorkspace id={id} />
        </RequireVerifiedArtist>
      </RequireRole>
    </PageContainer>
  );
}
