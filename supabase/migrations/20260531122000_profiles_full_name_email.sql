alter table public.profiles
  add column if not exists full_name text,
  add column if not exists email text;

update public.profiles set full_name = name where full_name is null and name is not null;

update public.profiles p
set email = u.email
from auth.users u
where p.auth_user_id = u.id and p.email is null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, auth_user_id, name, full_name, email)
  values (
    new.id,
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', null),
    new.email
  )
  on conflict (id) do update
    set auth_user_id = excluded.auth_user_id,
        email = coalesce(public.profiles.email, excluded.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
