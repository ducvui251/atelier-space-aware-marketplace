import type { NextRequest } from "next/server";
import { json } from "@/lib/server/respond";
import { resolvePhoneReachableOrigin } from "@/lib/ar/lan-origin";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const origin = resolvePhoneReachableOrigin();
  return json({
    url: origin ? `${origin}/artworks/${encodeURIComponent(id)}?ar=1` : null,
  });
}
