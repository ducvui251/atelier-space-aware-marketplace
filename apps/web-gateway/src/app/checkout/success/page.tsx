"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, Loader2, XCircle } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { RequireRole } from "@/components/auth/RequireRole";
import { Button } from "@/components/ui/button";
import { apiFetch, ApiError } from "@/lib/client/api";

type ConfirmState = "confirming" | "confirmed" | "not-paid-yet" | "error";

// Stripe confirms payment asynchronously relative to this redirect landing
// — retry a few times with a short delay instead of failing on the first
// 409 (see runbooks/stripe-integration.md).
const RETRY_DELAYS_MS = [1000, 2000, 3000];

function CheckoutSuccessView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const sessionId = searchParams.get("session_id");
  const [state, setState] = React.useState<ConfirmState>("confirming");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!sessionId) {
      setState("error");
      setErrorMessage("Thiếu session_id trong URL.");
      return;
    }

    let cancelled = false;

    async function confirm() {
      for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
          await apiFetch("/api/checkout/confirm", { method: "POST", body: JSON.stringify({ sessionId }) });
          if (!cancelled) setState("confirmed");
          return;
        } catch (error) {
          const isNotPaidYet = error instanceof ApiError && error.status === 409;
          if (isNotPaidYet && attempt < RETRY_DELAYS_MS.length) {
            if (!cancelled) setState("not-paid-yet");
            await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
            continue;
          }
          if (!cancelled) {
            setState("error");
            setErrorMessage(error instanceof ApiError ? error.message : "Không thể xác nhận thanh toán.");
          }
          return;
        }
      }
    }

    confirm();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  React.useEffect(() => {
    if (state !== "confirmed") return;
    const timeout = setTimeout(() => router.push("/orders?success=1"), 1500);
    return () => clearTimeout(timeout);
  }, [state, router]);

  if (state === "confirmed") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <CheckCircle2 className="size-12 text-success-foreground" />
        <p className="text-h3 text-foreground">Thanh toán thành công!</p>
        <p className="text-body-sm text-muted-foreground">Đang chuyển tới trang đơn hàng…</p>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <XCircle className="size-12 text-destructive" />
        <p className="text-h3 text-foreground">Không thể xác nhận thanh toán</p>
        <p className="text-body-sm text-muted-foreground">{errorMessage}</p>
        <Button asChild variant="outline" className="mt-2">
          <Link href="/orders">Xem đơn hàng của tôi</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 py-16 text-center">
      <Loader2 className="size-12 animate-spin text-muted-foreground" />
      <p className="text-h3 text-foreground">Đang xác nhận thanh toán với Stripe…</p>
      {state === "not-paid-yet" ? (
        <p className="text-body-sm text-muted-foreground">Vui lòng chờ trong giây lát.</p>
      ) : null}
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <PageContainer className="py-10">
      <RequireRole role={["buyer", "artist", "admin"]}>
        <Suspense fallback={null}>
          <CheckoutSuccessView />
        </Suspense>
      </RequireRole>
    </PageContainer>
  );
}
