-- Align public.profiles with frontend schema and enforce RLS
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  daily_calories integer not null default 2100,
  current_weight numeric,
  target_weight numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists name text;
alter table public.profiles add column if not exists daily_calories integer not null default 2100;
alter table public.profiles add column if not exists current_weight numeric;
alter table public.profiles add column if not exists target_weight numeric;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

grant select, insert, update, delete on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
