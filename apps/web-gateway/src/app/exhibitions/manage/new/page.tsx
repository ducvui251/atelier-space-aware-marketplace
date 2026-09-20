import { ExhibitionWorkspace } from "@/components/exhibitions/ExhibitionWorkspace";
import { RequireRole } from "@/components/auth/RequireRole";
import { RequireVerifiedArtist } from "@/components/auth/RequireVerifiedArtist";
import { PageContainer } from "@/components/layout/PageContainer";

export default function NewExhibitionPage() {
  return (
    <PageContainer className="py-12">
      <RequireRole role={["artist", "admin"]}>
        <RequireVerifiedArtist>
          <ExhibitionWorkspace id={null} />
        </RequireVerifiedArtist>
      </RequireRole>
    </PageContainer>
  );
}
