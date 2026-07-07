<div align="center">

# METALLURG — Control Room

**Internal admin dashboard for managing orders, products, and residents.**

Built with Next.js 15, Supabase, and Tailwind CSS.

</div>

---

## Overview

Control Room is the back-office admin panel for the Metallurg storefront. It gives a single authenticated admin a real-time view into the business: what's been ordered, what's in stock, and who's buying — with the ability to act on all three directly from the dashboard.

Customers interact with the storefront through a Telegram bot; Control Room is where the admin manages the data that bot reads and writes to (orders, products, and registered users), all backed by a shared Supabase database.

## Features

- **Overview dashboard** — live counts for total orders, revenue, products, and residents, plus a feed of the 10 most recent orders.
- **Order management** — searchable, filterable order table with a slide-in detail panel to review line items, update fulfillment status, attach a tracking number, and delete an order (with confirmation).
- **Product catalog** — full CRUD for products: pricing, stock status, sizes, materials, weight, and images, with a slug that auto-generates from the product name (and can be manually overridden).
- **Residents directory** — everyone registered through the Telegram bot, with a deterministic avatar, per-resident order count, and a "verified" badge once a resident has 3+ orders.
- **Passwordless auth** — sign-in via Supabase magic link, gated to a single admin email; every route is protected by middleware that redirects unauthenticated or non-admin users to `/login`.

## Tech stack

| Layer          | Choice                                      |
| -------------- | -------------------------------------------- |
| Framework      | [Next.js 15](https://nextjs.org) (App Router, React 19) |
| Backend/Auth   | [Supabase](https://supabase.com) (Postgres + Auth via `@supabase/ssr`) |
| Styling        | [Tailwind CSS 4](https://tailwindcss.com) |
| Animation      | [Framer Motion](https://www.framer.com/motion/) |
| Icons          | [Lucide](https://lucide.dev) |
| Language       | TypeScript |

## Getting started

### Prerequisites

- Node.js 20+
- A Supabase project with `orders`, `products`, and `bot_users` tables

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
   ADMIN_EMAIL=your-admin-email@example.com
   ```

   `ADMIN_EMAIL` is the only address permitted to sign in — anyone else is redirected back to `/login`, even with a valid magic link.

3. **Run the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and sign in with a magic link sent to `ADMIN_EMAIL`.

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
│   │   └── residents/     # Registered Telegram bot users
│   ├── auth/callback/     # Supabase magic-link exchange
│   └── login/             # Magic-link sign-in page
├── components/            # Sidebar, status badges, animated stats, etc.
├── lib/supabase/          # Browser, server, and shared Supabase clients
├── types/                 # Shared domain types (Order, Product, BotUser)
└── middleware.ts          # Route protection: auth + admin-email gate
```

## Authentication flow

1. The admin enters their email on `/login` and receives a Supabase magic link.
2. The link redirects to `/auth/callback`, which exchanges the code for a session.
3. `src/middleware.ts` checks every request: unauthenticated users are sent to `/login`; authenticated users whose email doesn't match `ADMIN_EMAIL` are also redirected.
4. The `(admin)` layout performs the same check server-side as a second guard before rendering any protected page.

## Deployment

The app deploys to [Vercel](https://vercel.com) on every push to `main` via GitHub Actions (see [.github/workflows](.github/workflows)):

- `vercel-deploy.yml` runs lint + build on pushes and pull requests.
- `deploy.yml` builds and deploys to production using `VERCEL_TOKEN`, `VERCEL_ORG_ID`, and `VERCEL_PROJECT_ID` repository secrets.

Remember to add `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and `ADMIN_EMAIL` as environment variables in your Vercel project settings.
