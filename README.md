# raia-fullstack-task-app

A polished full-stack task manager built with React, Vite, TypeScript, and Supabase Auth/Postgres.

## Features

- Email/password sign-up, sign-in, and sign-out through Supabase Auth
- Per-user task CRUD backed by a `public.tasks` table protected by Row Level Security
- Responsive dashboard with task statistics, due-date indicators, inline editing, completion toggles, and deletion
- TypeScript types generated from the Supabase schema
- Versioned Supabase migration stored under `supabase/migrations`
- GitHub Actions workflow for dependency installation, tests, and production build

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and fill in the browser-safe Supabase values:

   ```bash
   cp .env.example .env
   ```

3. Start Vite:

   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev` — start local development server
- `npm test` — run Vitest unit tests
- `npm run build` — type-check and create a production build
- `npm run preview` — preview the built app locally

## Security notes

Only the Supabase project URL and publishable key belong in frontend environment variables. Database passwords, service-role keys, and private tokens must never be committed or exposed to browser code.
