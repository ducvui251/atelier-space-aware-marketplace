import { query } from "@atelier/persistence";

/**
 * buyer_id stores the caller-supplied Supabase auth user id directly (same
 * convention as verification.artwork_verifications.reviewer_id) — Commerce
 * does not join account.users to resolve it.
 */
export async function listCart(buyerId: string): Promise<string[]> {
  const rows = await query<{ artwork_id: string }>(
    `select artwork_id::text from commerce.cart_items where buyer_id = $1::uuid order by created_at`,
    [buyerId],
  );
  return rows.map((row) => row.artwork_id);
}

export async function addCartItem(buyerId: string, artworkId: string): Promise<string[]> {
  await query(
    `insert into commerce.cart_items (buyer_id, artwork_id) values ($1::uuid, $2::uuid)
     on conflict (buyer_id, artwork_id) do nothing`,
    [buyerId, artworkId],
  );
  return listCart(buyerId);
}

export async function removeCartItem(buyerId: string, artworkId: string): Promise<string[]> {
  await query(`delete from commerce.cart_items where buyer_id = $1::uuid and artwork_id = $2::uuid`, [buyerId, artworkId]);
  return listCart(buyerId);
}
