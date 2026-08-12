-- ============================================================
-- CLEAN UP OLD AUTH STRUCTURE
-- ============================================================

-- Remove the old trigger from auth.users
drop trigger if exists on_auth_user_created
on auth.users;

-- Remove the old trigger function
drop function if exists public.handle_new_user();


-- Remove old profile table
drop table if exists public.profiles cascade;


-- Remove previous custom auth tables if they exist
drop table if exists public.app_sessions cascade;
drop table if exists public.app_users cascade;


-- ============================================================
-- APP USERS
-- ============================================================

create table public.app_users (
    user_id uuid primary key default gen_random_uuid(),

    username text not null unique,

    password_hash text not null,

    created_at timestamptz not null default now(),

    updated_at timestamptz not null default now()
);


-- ============================================================
-- APP SESSIONS
--
-- This identifies WHICH family member is logged in.
--
-- Supabase Auth session = database access
-- app_sessions       = actual application user
-- ============================================================

create table public.app_sessions (
    session_id uuid primary key default gen_random_uuid(),

    user_id uuid not null
        references public.app_users(user_id)
        on delete cascade,

    token_hash text not null unique,

    expires_at timestamptz not null,

    created_at timestamptz not null default now()
);


create index app_sessions_user_id_idx
on public.app_sessions(user_id);


create index app_sessions_expires_at_idx
on public.app_sessions(expires_at);


-- ============================================================
-- RLS
--
-- The browser must NEVER directly access these tables.
-- Only the Edge Function uses the service/secret key.
-- ============================================================

alter table public.app_users enable row level security;

alter table public.app_sessions enable row level security;


-- Explicitly deny browser access.

create policy "No direct access to app users"
on public.app_users
for all
to anon, authenticated
using (false)
with check (false);


create policy "No direct access to app sessions"
on public.app_sessions
for all
to anon, authenticated
using (false)
with check (false);


-- ============================================================
-- UPDATED_AT
-- ============================================================

create or replace function public.update_app_users_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


create trigger app_users_updated_at
before update on public.app_users
for each row
execute function public.update_app_users_updated_at();


-- ============================================================
-- BUSINESS TABLE ACCESS
--
-- Everyone who has a valid Supabase Auth session gets
-- complete access.
-- ============================================================

alter table public.products enable row level security;

alter table public.transactions enable row level security;

alter table public.transaction_items enable row level security;


-- Remove existing policies from these three tables.
-- This makes the following policies the complete access rules.

do $$
declare
    policy_record record;
begin

    for policy_record in
        select
            schemaname,
            tablename,
            policyname
        from pg_policies
        where schemaname = 'public'
          and tablename in (
              'products',
              'transactions',
              'transaction_items'
          )
    loop

        execute format(
            'drop policy if exists %I on %I.%I',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename
        );

    end loop;

end;
$$;


-- ============================================================
-- PRODUCTS
-- ============================================================

create policy "Authenticated users full access to products"
on public.products
for all
to authenticated
using (true)
with check (true);


-- ============================================================
-- TRANSACTIONS
-- ============================================================

create policy "Authenticated users full access to transactions"
on public.transactions
for all
to authenticated
using (true)
with check (true);


-- ============================================================
-- TRANSACTION ITEMS
-- ============================================================

create policy "Authenticated users full access to transaction items"
on public.transaction_items
for all
to authenticated
using (true)
with check (true);