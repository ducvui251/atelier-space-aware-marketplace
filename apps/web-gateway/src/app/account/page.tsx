import type { Metadata } from "next";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { AccountForm } from "@/components/account/AccountForm";

export const metadata: Metadata = {
  title: "Account",
  description: "Manage your Atelier account.",
};

export default function AccountPage() {
  return (
    <PageContainer className="py-16">
      <RequireRole role={["buyer", "artist", "admin"]}>
        <AccountForm />
      </RequireRole>
    </PageContainer>
  );
}
