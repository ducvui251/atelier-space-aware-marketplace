# Atelier — Art Discovery & Commerce Platform

An art discovery and marketplace experience. This is an early-stage build: it ships the
visual shell, design tokens, and mock/placeholder data — no live backend, auth, payments,
or recommendation engine yet. Data lives in `src/data/` as typed placeholders.

## Tech stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript** (strict)
- **Tailwind CSS v4** (CSS-variable design tokens in `src/app/globals.css`)
- Hand-written shadcn/ui-style primitives in `src/components/ui` (Radix: Slot, Dialog, DropdownMenu)
- **Lucide React** icons, **clsx** + **tailwind-merge**, **class-variance-authority**
- Package manager: **pnpm**

## Getting started

Requirements:

- [Node.js](https://nodejs.org/) — a recent LTS version
- [pnpm](https://pnpm.io/) — Node's built-in `corepack` may fail on Windows (EPERM). Install pnpm directly, e.g.:

  ```sh
  npm install -g pnpm
  ```

### 1. Clone

```sh
git clone https://github.com/ducvui251/atelier-space-aware-marketplace.git
cd atelier-space-aware-marketplace
```

### 2. Install dependencies

```sh
pnpm install
```

### 3. Configure environment

The app uses Supabase client auth plumbing (see `pnpm-workspace.yaml` and `src/lib/supabase/server.ts`), but the current shell runs fully on mock data. Copy the example env and fill in your Supabase project values if you want the client-side auth wiring to resolve:

```sh
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

> The anon key is public and safe for `NEXT_PUBLIC_`; never expose the service-role key.

The placeholder UI works without a Supabase project. If you don't set the keys, the
existing server-component flows that reference the client are left to your own usage.

### 4. Run the dev server

```sh
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command            | Description                             |
| ------------------ | --------------------------------------- |
| `pnpm dev`         | Start the dev server                    |
| `pnpm build`       | Production build (includes lint + type-check) |
| `pnpm start`       | Serve the production build             |
| `pnpm lint`        | Run the linter                          |
| `pnpm type-check`  | Run TypeScript type checking (`tsc --noEmit`) |

## Project structure

- `src/app/` — App Router pages (`/`, `/artworks`, `/artworks/[id]`, `/artists`, `/artists/[id]`, `/saved`, `/rooms`, `/account`, `/login`)
- `src/components/` — presentational components (`layout`, `ui`, `artwork`, `home`, `discovery`, …)
- `src/data/` — typed mock/placeholder content (artworks, artists, collections, rooms, images)
- `src/features/` — feature modules (e.g. `artworks/services`)
- `src/lib/` — utilities (Supabase server client, `cn()` helper)
- `src/types/` — shared TypeScript types

## Notes

- Placeholder image sources are whitelisted in `next.config.ts` (`picsum.photos`, `images.unsplash.com`).
- This is **not yet wired to a live backend**. Cart, favorites, auth state, and payments are mock/placeholder at this stage.
