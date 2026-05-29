-- Drop legacy NOT NULL `auth_user_id` column on public.profiles that blocks
-- inserts with: "null value in column auth_user_id ... violates not-null".
-- The current schema uses `id` (= auth.users.id) as the user link.

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'auth_user_id'
  ) then
    update public.profiles set auth_user_id = id where auth_user_id is null;
    alter table public.profiles drop column auth_user_id;
  end if;
end$$;

-- Backfill profile rows for any existing auth users that don't have one.
insert into public.profiles (id)
select u.id from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;
