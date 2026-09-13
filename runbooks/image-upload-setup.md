# Setting up artwork image uploads

The artwork form uploads a selected file to `POST /api/uploads/image`. The
Gateway requires a signed-in artist, validates the image type and 5 MB size
limit, then writes through the caller's cookie-bound Supabase session. Storage
RLS limits inserts to `artist-<auth.uid()>/` paths. The bucket is public so
marketplace visitors can read approved artwork images; uploads do not use a
service-role key.

The image is stored under a SHA-256 content path. Retrying the same upload
returns the existing public URL, and the Storage request has a 10-second
timeout. The artwork form accepts files only; the resulting URL is kept as a
hidden form value and shown as an image preview.

## One-time Supabase setup

### 1. Create or verify the bucket

In the [Supabase dashboard](https://supabase.com/dashboard), open the project
and choose **Storage**. Create the bucket if it does not already exist; if it
exists, verify these settings:

- Name: `artwork-images` (the Gateway uses this fixed name).
- Public bucket: **on**, so the returned public URLs can be displayed in the
  catalog.
- Maximum file size: 5 MB.
- Allowed MIME types: `image/jpeg`, `image/png`, `image/webp`, and
  `image/avif`.

### 2. Restrict uploads to each artist's folder

Run this policy in the Supabase SQL Editor after creating the bucket. It grants
only authenticated inserts to the matching Supabase auth user's folder. The
Gateway uses `upsert: false`, so the policy does not need update or select
permissions.

```sql
drop policy if exists atelier_artist_artwork_uploads on storage.objects;

create policy atelier_artist_artwork_uploads
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'artwork-images'
  and (storage.foldername(name))[1] = 'artist-' || (select auth.uid()::text)
);
```

The Gateway writes paths in this form:

```text
artist-<Supabase auth user UUID>/<sha256>.<jpg|png|webp|avif>
```

### 3. Configure the public Supabase client values

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in
the usual host `.env.local` and Compose `.env` files. These are public client
configuration; no Storage secret or service-role key is needed. Rebuild the
Gateway after changing `NEXT_PUBLIC_*` values because Next.js embeds them at
build time:

```bash
docker compose build web-gateway
docker compose up -d web-gateway
```

### 4. Verify

Sign in as an artist, open the artwork create/edit form, choose a supported
image, and confirm that the upload completes and the preview appears. The
form submits the returned Storage URL with the artwork record. Invalid files
return `400`, missing artist access returns `401` or `403`, Storage failures
return `502`, and a Storage timeout returns `504`.
