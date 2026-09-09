# Setting up image upload (G-05)

**What this feature does:** an artist selects a photo in the artwork form
(`ArtworkForm.tsx`), the browser posts it to `POST /api/uploads/image`
([route.ts](../apps/web-gateway/src/app/api/uploads/image/route.ts)), the
Gateway validates the caller (must be logged in, must have the `artist`
role), the MIME type (`image/jpeg`, `image/png`, `image/webp`,
`image/avif`) and the size (5MB cap), then writes the bytes into a
Supabase Storage bucket using a service-role key and returns the file's
public URL. That URL fills the same `imageUrl` field the manual URL-paste
input already used — pasting a URL directly still works as a fallback.

**The code is already in place.** What's missing is the Supabase-side
bucket and a service-role key, which only you can create — I don't have
access to your Supabase dashboard. Until you do the steps below, the
Gateway itself starts and runs fine; only `POST /api/uploads/image` fails
with a `500` ("Image upload is not configured on this deployment").

## What you need to do (steps I can't do for you)

### 1. Create the Storage bucket

In the [Supabase dashboard](https://supabase.com/dashboard), open your
project → **Storage** (left sidebar) → **New bucket**.

- Name: `artwork-images` (must match exactly, or set
  `SUPABASE_STORAGE_BUCKET` below to whatever name you actually used).
- **Public bucket**: turn this **ON**. Artwork photos need to be viewable
  by anyone browsing the marketplace, and the Gateway generates public URLs
  (`getPublicUrl`), not signed ones.
- Leave the file-size/MIME restrictions at the bucket level as-is — the
  Gateway already enforces its own 5MB cap and MIME allow-list before it
  ever reaches Storage, so bucket-level limits are redundant, not required.

Click **Save**. No storage policies (RLS) need to be added: uploads always
go through the service-role key (below), which bypasses Storage RLS
entirely, so there is nothing for an `anon`/`authenticated`-role INSERT
policy to grant. Public **read** is handled by the "Public bucket" toggle
itself, not by an RLS policy.

### 2. Copy the service-role key

Project **Settings** (gear icon) → **API** → **Project API keys** →
copy the **`service_role`** key (NOT the `anon`/`publishable` key you
already used for `NEXT_PUBLIC_SUPABASE_ANON_KEY`).

**This key bypasses every Row Level Security policy in your project.**
Treat it like a root password:
- Never prefix it `NEXT_PUBLIC_` — that would ship it to every visitor's
  browser.
- Never commit it to git (`.env` is already gitignored; only `.env.example`
  is tracked, and it ships with an empty placeholder).
- Only `apps/web-gateway/src/lib/supabase/service-role.ts` reads it, and
  only inside the one upload route handler — it is never forwarded to any
  other service.

### 3. Set the environment variables

In your `.env` (the untracked file `docker compose` actually reads):

```
SUPABASE_SERVICE_ROLE_KEY=<the service_role key you just copied>
SUPABASE_STORAGE_BUCKET=artwork-images
```

`SUPABASE_STORAGE_BUCKET` defaults to `artwork-images` in
`docker-compose.yml` if you leave it unset — only set it if you named the
bucket something else in step 1.

### 4. Rebuild and restart the Gateway

```bash
docker compose build web-gateway
docker compose up -d web-gateway
```

(`SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_STORAGE_BUCKET` are read at runtime,
not baked into the build — a `docker compose up -d web-gateway` alone,
without rebuilding, is also enough once the image already exists.)

### 5. Verify

Log in as an artist, open the artwork create/edit form, and pick an image
file. It should upload and show a preview; the URL field underneath fills
in automatically. If it still 500s, check `docker compose logs web-gateway`
— the error message names exactly which piece (key, bucket) is missing.
