-- REVIVE GEN — STEP 3 ADMIN SECURITY
-- Run this in Supabase SQL Editor.
--
-- First create your admin login in:
-- Supabase Dashboard -> Authentication -> Users -> Add user
-- Then replace YOUR-ADMIN-EMAIL below and run the whole file.

create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admins
    where user_id = auth.uid()
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Add your login as an admin.
-- IMPORTANT: replace the email between the quotes.
insert into public.admins (user_id, email)
select id, email
from auth.users
where lower(email) = lower('YOUR-ADMIN-EMAIL')
on conflict (user_id) do update
set email = excluded.email;

-- Lock down orders and order_items so only an authenticated admin
-- can read/update them through the browser.
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

drop policy if exists "admins can view orders" on public.orders;
create policy "admins can view orders"
on public.orders
for select
to authenticated
using ((select public.is_admin()));

drop policy if exists "admins can update orders" on public.orders;
create policy "admins can update orders"
on public.orders
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));

drop policy if exists "admins can view order items" on public.order_items;
create policy "admins can view order items"
on public.order_items
for select
to authenticated
using ((select public.is_admin()));

-- Do not expose the admin table itself through the Data API.
revoke all on public.admins from anon, authenticated;

-- The order-placement RPC remains callable by visitors.
-- Its own SECURITY DEFINER logic creates the order.
grant execute on function public.place_order(
  text,text,text,text,text,text,jsonb
) to anon;
