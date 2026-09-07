import { createClient } from "@/lib/supabase/server";
import { json } from "@/lib/server/respond";

export async function POST() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return json({ success: true });
}
