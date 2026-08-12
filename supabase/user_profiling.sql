-- =========================================================
-- PROFILES
-- =========================================================

create table public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,

    username text not null unique,

    created_at timestamp without time zone not null default now(),
    updated_at timestamp without time zone not null default now()
);


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.profiles enable row level security;


-- A logged-in user can read profiles.
--
-- Since this is currently a family application where everyone
-- has full access, this is intentionally simple.

create policy "Authenticated users can read profiles"
on public.profiles
for select
to authenticated
using (true);


-- Users can update their own profile.

create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);


-- =========================================================
-- AUTOMATIC PROFILE CREATION
-- =========================================================

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin

    insert into public.profiles (
        id,
        username
    )
    values (
        new.id,
        new.raw_user_meta_data ->> 'username'
    );

    return new;

end;
$$;


create trigger on_auth_user_created
    after insert on auth.users
    for each row
    execute procedure public.handle_new_user();