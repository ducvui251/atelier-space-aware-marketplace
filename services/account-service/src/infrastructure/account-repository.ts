import { query } from "@atelier/persistence";

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
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: AccountUser["role"];
  created_at: string;
  artist_id: string | null;
};

function mapUser(row: AccountRow): AccountUser {
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    ...(row.phone ? { phone: row.phone } : {}),
    role: row.role,
    createdAt: row.created_at,
    ...(row.artist_id ? { artistId: row.artist_id } : {}),
  };
}

const userSelect = `
  select u.auth_user_id::text as id, u.full_name, u.email, u.phone, u.role,
         u.created_at::text as created_at, ap.id::text as artist_id
  from account.users u
  left join artist_artwork.artist_profiles ap on ap.user_id = u.id
`;

export async function findByAuthUserId(authUserId: string): Promise<AccountUser | null> {
  const rows = await query<AccountRow>(`${userSelect} where u.auth_user_id = $1::uuid`, [authUserId]);
  return rows[0] ? mapUser(rows[0]) : null;
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
    select u.auth_user_id::text as id, u.full_name, u.email, u.phone, u.role,
           u.created_at::text as created_at, ap.id::text as artist_id
    from upserted u
    left join artist_artwork.artist_profiles ap on ap.user_id = u.id`,
    [input.authUserId, input.email, input.fullName ?? "", input.phone ?? null],
  );
  if (!upserted[0]) throw new Error("Account profile was not persisted");
  return mapUser(upserted[0]);
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
