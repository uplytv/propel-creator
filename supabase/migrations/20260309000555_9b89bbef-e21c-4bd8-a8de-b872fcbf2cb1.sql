
-- Create user roles system per guidelines
create type public.app_role as enum ('admin', 'moderator', 'user');

create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- Security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- Allow admins to read all payout_requests
create policy "Admins view all payouts" on payout_requests for select
using (public.has_role(auth.uid(), 'admin'));

-- Allow admins to update payout_requests
create policy "Admins update payouts" on payout_requests for update
using (public.has_role(auth.uid(), 'admin'));
