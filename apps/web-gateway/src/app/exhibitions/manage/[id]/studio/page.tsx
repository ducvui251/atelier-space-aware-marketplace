import { redirect } from "next/navigation";

export default async function ExhibitionStudioPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/exhibitions/manage/${encodeURIComponent(id)}`);
}
