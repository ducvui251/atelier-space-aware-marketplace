import { query } from "@atelier/persistence";
import { InternalServiceError, requestInternalService } from "@atelier/config/service-client";

export interface AccountUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  role: "buyer" | "artist" | "admin";
  createdAt: string;
  artistId?: string;
}

type AccountRow = {
  internal_id: string;
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AccountUser["role"];
  created_at: string;
};

/**
 * Artist & Artwork owns the artist_profiles table; Account only owns the
 * association's *existence*, resolved by calling that service rather than
 * joining across schemas from this process.
 */
async function findArtistIdForUser(internalUserId: string): Promise<string | undefined> {
  try {
    const artist = await requestInternalService<{ id: string }>("artist-artwork", `/v1/artist-artwork/artists/by-user/${encodeURIComponent(internalUserId)}`);
    return artist.id;
  } catch (error) {
    if (error instanceof InternalServiceError && error.status === 404) return undefined;
    throw error;
  }
}

async function mapUser(row: AccountRow): Promise<AccountUser> {
  const artistId = await findArtistIdForUser(row.internal_id);
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    ...(row.phone ? { phone: row.phone } : {}),
    role: row.role,
    createdAt: row.created_at,
    ...(artistId ? { artistId } : {}),
  };
}

const userSelect = `
  select u.id::text as internal_id, u.auth_user_id::text as id, u.full_name, u.email, u.phone, u.role,
         u.created_at::text as created_at
  from account.users u
`;

export async function findByAuthUserId(authUserId: string): Promise<AccountUser | null> {
  const rows = await query<AccountRow>(`${userSelect} where u.auth_user_id = $1::uuid`, [authUserId]);
  return rows[0] ? await mapUser(rows[0]) : null;
}

export async function syncAuthUser(input: {
  authUserId: string;
  email: string;
  fullName?: string;
  phone?: string;
}): Promise<AccountUser> {
  const upserted = await query<AccountRow>(
    `with upserted as (
      insert into account.users (auth_user_id, full_name, email, phone, role)
      values ($1::uuid, $3, $2, $4, 'buyer')
      on conflict (auth_user_id) do update set
        email = excluded.email,
        full_name = case when excluded.full_name <> '' then excluded.full_name else account.users.full_name end,
        phone = coalesce(excluded.phone, account.users.phone),
        updated_at = now()
      returning *
    )
    select u.id::text as internal_id, u.auth_user_id::text as id, u.full_name, u.email, u.phone, u.role,
           u.created_at::text as created_at
    from upserted u`,
    [input.authUserId, input.email, input.fullName ?? "", input.phone ?? null],
  );
  if (!upserted[0]) throw new Error("Account profile was not persisted");
  return await mapUser(upserted[0]);
}

export async function updateProfile(authUserId: string, input: { fullName: string; phone?: string }): Promise<AccountUser | null> {
  const rows = await query<AccountRow>(
    `${userSelect}
     where u.auth_user_id = $1::uuid`,
    [authUserId],
  );
  if (!rows[0]) return null;
  await query(
    `update account.users set full_name = $2, phone = coalesce($3, phone), updated_at = now()
     where auth_user_id = $1::uuid`,
    [authUserId, input.fullName, input.phone ?? null],
  );
  return findByAuthUserId(authUserId);
}
