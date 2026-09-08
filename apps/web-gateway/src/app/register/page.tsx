import type { Metadata } from "next";
import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create an Atelier account.",
};

export default function RegisterPage() {
  return (
    <PageContainer className="py-16">
      <div className="mx-auto w-full max-w-md">
        <p className="eyebrow">Join Atelier</p>
        <h1 className="mt-2 font-display text-h2 text-foreground">Tạo tài khoản</h1>
        <p className="mt-3 text-body text-muted-foreground">
          Điền thông tin bên dưới để tạo tài khoản mới.
        </p>
        <div className="mt-8">
          <RegisterForm />
        </div>
        <p className="mt-6 text-body-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href="/login" className="font-medium text-foreground underline underline-offset-2">
            Đăng nhập
          </Link>
        </p>
      </div>
    </PageContainer>
  );
}
