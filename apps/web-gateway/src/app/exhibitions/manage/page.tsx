import { ExhibitionManager } from "@/components/exhibitions/ExhibitionManager";
import { RequireRole } from "@/components/auth/RequireRole";
import { PageContainer } from "@/components/layout/PageContainer";

export default function ManageExhibitionsPage() {
  return (
    <PageContainer className="py-12">
      <RequireRole role={["artist", "admin"]}>
        <ExhibitionManager />
      </RequireRole>
    </PageContainer>
  );
}
