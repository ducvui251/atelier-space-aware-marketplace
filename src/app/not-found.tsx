import Link from "next/link";
import { PageContainer } from "@/components/layout/PageContainer";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ImageOff } from "lucide-react";

export default function NotFound() {
  return (
    <PageContainer className="py-20">
      <EmptyState
        icon={ImageOff}
        title="This page isn’t here"
        description="The artwork or page you’re looking for doesn’t exist in this placeholder build."
        action={
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
        }
      />
    </PageContainer>
  );
}
