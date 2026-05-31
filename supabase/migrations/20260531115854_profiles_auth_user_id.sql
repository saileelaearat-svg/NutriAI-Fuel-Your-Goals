-- Add auth_user_id column to public.profiles and key reads/writes off it.
alter table public.profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete cascade;

update public.profiles set auth_user_id = id where auth_user_id is null;

insert into public.profiles (id, auth_user_id)
select u.id, u.id from auth.users u
left join public.profiles p on p.auth_user_id = u.id
where p.auth_user_id is null
on conflict (id) do update set auth_user_id = excluded.auth_user_id;

alter table public.profiles alter column auth_user_id set not null;

create unique index if not exists profiles_auth_user_id_key
  on public.profiles(auth_user_id);

drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can insert own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Users can view own profile" on public.profiles
  for select to authenticated using (auth.uid() = auth_user_id);

create policy "Users can insert own profile" on public.profiles
  for insert to authenticated with check (auth.uid() = auth_user_id);

create policy "Users can update own profile" on public.profiles
  for update to authenticated
  using (auth.uid() = auth_user_id) with check (auth.uid() = auth_user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, auth_user_id, name)
  values (
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null)
  )
  on conflict (id) do update set auth_user_id = excluded.auth_user_id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
