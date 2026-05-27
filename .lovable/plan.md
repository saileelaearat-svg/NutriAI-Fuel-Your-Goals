# NutriAI — Production Restructure & Live Backend

## Goal
Turn the single-file mock into a clean React + Vite + TypeScript app, connected to your Supabase project (`bmcfpsoxujavozydovqn`) for auth + data, with an AI-powered food scanner via Lovable AI Gateway.

## Backend note (important)
You asked to connect to **your own** Supabase project. Lovable can write client code against it using the publishable key you provided, but **Lovable cannot create tables, RLS policies, or edge functions inside your external Supabase project from here** — that has to be done in your own Supabase dashboard.

To handle this cleanly, the plan does two things:
1. **Data + Auth → your Supabase project** (`bmcfpsoxujavozydovqn`) using the publishable key in code.
2. **AI food scanner edge function → Lovable Cloud** (a separate managed backend just for the serverless AI call, so `LOVABLE_API_KEY` stays server-side and you don't have to deploy edge functions manually).

I will give you a ready-to-paste SQL script for the tables/RLS to run in your Supabase SQL editor.

## New project structure

```text
src/
  lib/
    supabase.ts              # external Supabase client (your project)
    queries.ts               # typed data access (meals, water, profile)
    nutrition.ts             # totals, remaining, % helpers
  hooks/
    useAuth.ts               # session + onAuthStateChange
    useTodayNutrition.ts     # realtime today totals
    useWeeklyNutrition.ts    # last 7 days for chart
    useMeals.ts              # diary list + add/delete
  components/
    Ring.tsx
    BottomNav.tsx
    MealCard.tsx
    MacroBar.tsx
    WaterTracker.tsx
  pages/
    Splash.tsx
    Auth.tsx                 # email/password + Google
    Home.tsx                 # live dashboard
    Scanner.tsx              # photo upload → AI
    Result.tsx               # save to diary
    Diary.tsx                # today's meals from DB
    Analytics.tsx            # 7-day chart from DB
    Profile.tsx              # profile + sign out
  App.tsx                    # react-router routes + auth guard
  main.tsx
  index.css                  # design tokens (dark + #ff6b35 accent)
```

## Database schema (run in YOUR Supabase SQL editor)

```sql
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  daily_calorie_goal int default 2100,
  protein_goal int default 150,
  carbs_goal int default 220,
  fat_goal int default 70,
  weight_kg numeric,
  target_weight_kg numeric,
  created_at timestamptz default now()
);

create table public.meals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  name text not null,
  meal_type text check (meal_type in ('breakfast','lunch','dinner','snack')),
  calories int not null,
  protein numeric default 0,
  carbs numeric default 0,
  fat numeric default 0,
  consumed_at timestamptz not null default now()
);
create index on public.meals (user_id, consumed_at desc);

create table public.water_intake (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  glasses int not null default 1,
  logged_at timestamptz not null default now()
);

-- Auto-create profile on signup
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data->>'full_name');
  return new;
end; $$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- GRANTS (required for Data API)
grant select, insert, update, delete on public.profiles, public.meals, public.water_intake to authenticated;
grant all on public.profiles, public.meals, public.water_intake to service_role;

-- RLS
alter table public.profiles enable row level security;
alter table public.meals enable row level security;
alter table public.water_intake enable row level security;

create policy "own profile" on public.profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
create policy "own meals" on public.meals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own water" on public.water_intake for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

You'll also need to enable **Google provider** in your Supabase dashboard → Authentication → Providers.

## Live data behavior (replaces all mock data)

- `Home`: subscribes to `meals` + `water_intake` for today via Supabase realtime → totals + remaining + macro bars recompute instantly.
- `Diary`: queries today's meals grouped by `meal_type` → real entries, add/delete supported.
- `Analytics`: queries last 7 days, aggregates calories per day server-side via a view or client-side reducer.
- `Profile`: live `profiles` row, editable goals, sign-out.
- `Auth`: email/password + Google sign-in; redirects to `/` on success; session persists.
- `Scanner`: user uploads/captures a photo → uploaded to a Lovable Cloud edge function `analyze-food` that calls Lovable AI (Gemini vision) → returns `{name, calories, protein, carbs, fat}` → Result screen saves it to `meals` in your Supabase.

## Tech / dependencies
- React Router for routing + auth guard
- `@supabase/supabase-js` (already implied)
- `recharts` for the weekly bar chart
- Tailwind + shadcn (matches existing dark + orange accent: bg `#0a0a0f`, accent `#ff6b35`)

## What you'll do after I build
1. Paste the SQL above into your Supabase SQL editor.
2. Enable Google provider in your Supabase Auth settings.
3. Add `https://id-preview--5fa95345-...lovable.app` and your final domain to Supabase Auth → URL Configuration → Redirect URLs.

The publishable key `sb_publishable_oc1bWPRwani7jG3GOj6Lbg_8BSzo2rS` is safe to ship in the frontend (it's the anon/publishable key — RLS protects the data).