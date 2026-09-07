<div align="center">

# METALLURG — Control Room

**Internal admin dashboard for managing orders, products, and residents.**

Built with Next.js 15, Supabase, and Tailwind CSS.

</div>

---

## Overview

Control Room is the back-office admin panel for the Metallurg storefront. It gives an authenticated admin an at-a-glance view of the business: what's been ordered, what's in stock, and who's buying — with the ability to act on all three directly from the dashboard. Data is loaded on each page visit (there is no live subscription).

Customers interact with the storefront through a Telegram bot; Control Room is where the admin manages the data that bot reads and writes to (orders, products, and registered users), all backed by a shared Supabase database.

## Features

- **Overview dashboard** — current counts for total orders, revenue (excluding cancelled orders), products, and residents, plus a feed of the 10 most recent orders.
- **Order management** — searchable, filterable order table with a slide-in detail panel to review line items, update fulfillment status, attach a tracking number, and delete an order (with confirmation).
- **Product catalog** — full CRUD for products: pricing, stock status, sizes, materials, weight, and images, with a slug that auto-generates from the product name (and can be manually overridden).
- **Residents directory** — everyone registered through the Telegram bot, with a deterministic avatar, per-resident order count, and a "verified" badge once a resident has 3+ orders.
- **Batch image upload** — drag-and-drop up to 20 images. Background removal runs **in the browser** (`@imgly/background-removal`, no API key or quota); each image is then sent to `/api/admin/process-image`, converted to WebP, and stored in the `products` Storage bucket. Progress streams into a terminal-style log.
- **Passwordless auth** — sign-in via Supabase magic link. Access is gated on the database `public.admins` table (via the `is_admin()` SQL function — the same predicate the RLS policies use), checked in `middleware.ts`, the `(admin)` layout, and the image API route. Anyone not in `admins` is redirected to `/login`.

## Tech stack

| Layer          | Choice                                      |
| -------------- | -------------------------------------------- |
| Framework      | [Next.js 15](https://nextjs.org) (App Router, React 19) |
| Backend/Auth   | [Supabase](https://supabase.com) (Postgres + Auth via `@supabase/ssr`) |
| Styling        | [Tailwind CSS 4](https://tailwindcss.com) |
| Animation      | [Framer Motion](https://www.framer.com/motion/) |
| Icons          | [Lucide](https://lucide.dev) |
| Image pipeline | [`@imgly/background-removal`](https://github.com/imgly/background-removal-js) (browser) + [`sharp`](https://sharp.pixelplumbing.com) (WebP) |
| Language       | TypeScript |

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project with:
  - `orders`, `products`, `bot_users` tables
  - an `admins` table and an `is_admin()` SQL function (`select exists (select 1 from public.admins where user_id = auth.uid())`), used by both the app's auth gate and the RLS policies
  - a public Storage bucket named `products` (for uploaded images)

### Setup

1. **Clone and install dependencies**

   ```bash
   npm install
   ```

2. **Configure environment variables**

   Create a `.env.local` in the project root:

   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

   # Server-only — required by the image upload route (/api/admin/process-image)
   SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
   ```

   There is no admin-email env var — who may sign in is controlled entirely by the
   `public.admins` table in Supabase. Add a row with the admin's `user_id` (from
   `auth.users`) to grant access.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with a magic link sent to an email whose user is listed in the `admins` table.

### Scripts

| Command         | Description                        |
| ---------------- | ----------------------------------- |
| `npm run dev`     | Start the local development server |
| `npm run build`   | Build for production                |
| `npm run start`   | Run the production build            |
| `npm run lint`    | Lint the codebase with ESLint       |

## Project structure

```
src/
├── app/
│   ├── (admin)/           # Protected admin routes
│   │   ├── layout.tsx     # Auth guard + sidebar shell
│   │   ├── page.tsx       # Overview dashboard
│   │   ├── orders/        # Order management
│   │   ├── products/      # Product catalog
│   │   ├── residents/     # Registered Telegram bot users
│   │   └── upload/        # Batch image upload (bg removal → WebP → Storage)
│   ├── api/admin/process-image/  # WebP conversion + Storage upload (sharp)
│   ├── auth/confirm/      # verifyOtp(token_hash) — email link target
│   ├── auth/callback/     # verifyOtp + legacy ?code= exchange
│   └── login/             # Magic-link sign-in page
├── components/            # Sidebar, status badges, animated stats, etc.
├── lib/supabase/          # Browser, server, and shared Supabase clients; checkAdmin()
├── lib/utils/             # cn(), formatDateTime()
├── types/                 # Shared domain types (Order, Product, BotUser)
└── middleware.ts          # Route protection: auth + is_admin() gate
```

## Authentication flow

1. The admin enters their email on `/login` and receives an email (`shouldCreateUser: false` — unknown emails get nothing).
2. The email link points to `/auth/confirm?token_hash=…&type=…`, which calls `supabase.auth.verifyOtp(...)` to establish the session (no PKCE code-verifier cookie needed — resilient to link scanners and localhost/prod origin splits). `/auth/callback` handles the same, plus the legacy `?code=` exchange. Alternatively the admin types the 6-digit code from the email into `/login`.
3. `src/middleware.ts` checks every request: unauthenticated users are sent to `/login`; authenticated users for whom `is_admin()` is not true are also redirected.
4. The `(admin)` layout runs the same `is_admin()` check server-side as a second guard before rendering any protected page, and `/api/admin/process-image` runs it before doing any work.

> Requires the Supabase **Site URL** and **Redirect URLs** to be set correctly — see `docs/email-templates/README.md`.

## Deployment

The app is hosted on [Vercel](https://vercel.com), which builds and deploys directly from its Git integration on every push to `main`.

CI is a single GitHub Actions workflow, [`.github/workflows/vercel-deploy.yml`](.github/workflows/vercel-deploy.yml), which runs `npm ci`, lint, and `next build` on every push and pull request. It does **not** deploy — Vercel does that.

Set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` as environment variables in your Vercel project settings.
