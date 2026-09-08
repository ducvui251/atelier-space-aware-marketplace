# Atelier — Art Discovery & Commerce Platform

An art discovery and marketplace experience. This is an early-stage build: it ships the
visual shell, design tokens, and service-owned mock data — no live backend or external
payment provider yet.

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

The app uses Supabase client auth plumbing (see `pnpm-workspace.yaml` and `apps/web-gateway/src/lib/supabase/server.ts`), but the current shell runs fully on mock data. Copy the example env and fill in your Supabase project values if you want the client-side auth wiring to resolve:

```sh
cp .env.example .env.local
```

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

> The publishable key is public and safe for `NEXT_PUBLIC_`; never expose a secret/service-role key.

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

## Monorepo scaffold

The repository uses a microservices monorepo layout. The Next.js application under
`apps/web-gateway/` is the web application and API Gateway/BFF. Eight domain-service
packages under `services/` own domain logic and publish versioned entry points; shared
contracts and configuration live under `packages/`. The gateway currently composes the
service modules in-process for the mock MVP, so each boundary can later be deployed as
an independent runtime without moving domain logic again.

- `services/` — eight internal service boundaries and domain modules
- `packages/` — versioned contracts and shared configuration primitives
- `apps/web-gateway/` — Next.js web app and API Gateway/BFF
- `docs/architecture/MONOREPO.md` — runtime and ownership rules

## Project structure

- `apps/web-gateway/src/app/` — App Router pages and public `/api/*` Gateway/BFF routes
- `apps/web-gateway/src/components/` — presentational components
- `apps/web-gateway/src/data/` — typed mock/placeholder content for the gateway adapter
- `apps/web-gateway/src/lib/gateway/` — service registry and composition boundary
- `apps/web-gateway/src/lib/` — UI and infrastructure utilities
- `packages/contracts/` — shared versioned domain types and service contracts

## Notes

- Placeholder image sources are whitelisted in `next.config.ts` (`picsum.photos`, `images.unsplash.com`).
- This is **not yet wired to a live backend**. Cart, favorites, auth state, and payments are mock/placeholder at this stage.
