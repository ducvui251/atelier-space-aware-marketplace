import { ShieldCheck, ShieldQuestion } from "lucide-react";
import type { EditionType, VerificationStatus } from "@/types";
import { Badge } from "@/components/ui/badge";

interface VerificationBadgeProps {
  verificationStatus: VerificationStatus;
  editionType: EditionType;
}

export function VerificationBadge({
  verificationStatus,
  editionType,
}: VerificationBadgeProps) {
  const editionLabel =
    editionType === "original" ? "Original" : "Limited edition";

  const verified = verificationStatus === "verified";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Badge variant="outline">{editionLabel}</Badge>
      {verified ? (
        <Badge variant="success">
          <ShieldCheck className="size-3.5" />
          Verified
        </Badge>
      ) : (
        <Badge variant="warning">
          <ShieldQuestion className="size-3.5" />
          Pending review
        </Badge>
      )}
    </div>
  );
}
