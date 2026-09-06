import { query } from "@atelier/persistence";

export async function listCart(authUserId: string): Promise<string[]> {
  const rows = await query<{ artwork_id: string }>(
    `select c.artwork_id::text from commerce.cart_items c
     join account.users u on u.id = c.buyer_id
     where u.auth_user_id = $1::uuid order by c.created_at`, [authUserId],
  );
  return rows.map((row) => row.artwork_id);
}

export async function addCartItem(authUserId: string, artworkId: string): Promise<string[]> {
  await query(
    `insert into commerce.cart_items (buyer_id, artwork_id)
     select u.id, $2::uuid from account.users u where u.auth_user_id = $1::uuid
     on conflict (buyer_id, artwork_id) do nothing`, [authUserId, artworkId],
  );
  return listCart(authUserId);
}

export async function removeCartItem(authUserId: string, artworkId: string): Promise<string[]> {
  await query(
    `delete from commerce.cart_items c using account.users u
     where c.buyer_id = u.id and u.auth_user_id = $1::uuid and c.artwork_id = $2::uuid`, [authUserId, artworkId],
  );
  return listCart(authUserId);
}
