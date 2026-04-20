# GATE CS 2027 Squad

This app supports two modes:

- Local-only mode stores data in the browser on that machine.
- Cloud mode uses Supabase so the same data is available from anywhere and remains saved until you delete it.

## Run locally

```bash
npm install
npm run dev
```

Without Supabase env vars, the app automatically falls back to browser `localStorage`.

## GitHub Pages deployment

This repo includes automatic Pages deployment in [.github/workflows/deploy.yml](C:\Users\Admin\OneDrive\Desktop\Gate Tracker\gate-cs-2027-squad\.github\workflows\deploy.yml).

1. Push this repo to GitHub.
2. In `Settings -> Pages`, set the source to `GitHub Actions`.
3. Push to `main` and GitHub will build and deploy automatically.

## Cloud persistence setup

Create a Supabase project and run this SQL:

```sql
create table if not exists public.tracker_data (
  id uuid primary key default gen_random_uuid(),
  user_id uuid null,
  room_code text unique,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamp with time zone not null default now()
);

alter table public.tracker_data enable row level security;

drop policy if exists "Anyone can view tracker data by room code" on public.tracker_data;
drop policy if exists "Anyone can insert tracker data with room code" on public.tracker_data;
drop policy if exists "Anyone can update tracker data by room code" on public.tracker_data;

create policy "Anyone can view tracker data by room code"
on public.tracker_data for select
to anon, authenticated
using (room_code is not null);

create policy "Anyone can insert tracker data with room code"
on public.tracker_data for insert
to anon, authenticated
with check (room_code is not null);

create policy "Anyone can update tracker data by room code"
on public.tracker_data for update
to anon, authenticated
using (room_code is not null);

alter publication supabase_realtime add table public.tracker_data;
```

Then add these GitHub Actions secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

After that, each push to `main` deploys the app with cloud sync enabled.

## Local development with cloud sync

Copy [.env.example](C:\Users\Admin\OneDrive\Desktop\Gate Tracker\gate-cs-2027-squad\.env.example) to `.env.local` and fill in your Supabase values.

```bash
npm run build
```

The Vite config uses a relative asset base, so the generated `dist` folder works on GitHub Pages.
Made by Bhavesh

