
-- Wallet for every user (user_id = auth uid)
create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  available_balance decimal(10,2) default 0,
  pending_balance decimal(10,2) default 0,
  lifetime_earned decimal(10,2) default 0,
  lifetime_withdrawn decimal(10,2) default 0,
  currency text default 'USD',
  created_at timestamptz default now()
);

-- Every money movement
create table transactions (
  id uuid primary key default gen_random_uuid(),
  wallet_id uuid references wallets(id) on delete cascade,
  type text check (type in ('earn','withdrawal','fee','refund','tip')),
  amount decimal(10,2) not null,
  status text check (status in ('pending','completed','failed')) default 'pending',
  description text,
  reference_id uuid,
  platform_fee_amount decimal(10,2) default 0,
  net_amount decimal(10,2),
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Withdrawal requests
create table payout_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount decimal(10,2) not null,
  status text check (status in ('pending','processing','completed','failed')) default 'pending',
  payout_method text check (payout_method in ('bank','paypal','stripe')),
  payout_details jsonb,
  requested_at timestamptz default now(),
  processed_at timestamptz,
  notes text
);

-- Platform fee log
create table platform_fees (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references transactions(id),
  fee_type text check (fee_type in ('subscription_fee','marketplace_fee','tip_fee','boost_fee')),
  percentage decimal(5,2),
  amount decimal(10,2),
  created_at timestamptz default now()
);

-- RLS policies
alter table wallets enable row level security;
create policy "Users view own wallet" on wallets for select using (auth.uid() = user_id);

alter table transactions enable row level security;
create policy "Users view own transactions" on transactions for select
using (wallet_id in (select id from wallets where user_id = auth.uid()));

alter table payout_requests enable row level security;
create policy "Users view own payouts" on payout_requests for select using (auth.uid() = user_id);
create policy "Users create own payouts" on payout_requests for insert with check (auth.uid() = user_id);

alter table platform_fees enable row level security;
create policy "Users view own fees" on platform_fees for select
using (transaction_id in (select id from transactions where wallet_id in (select id from wallets where user_id = auth.uid())));

-- Auto-create wallet on profile creation
create or replace function create_wallet_for_new_user()
returns trigger as $$
begin
  insert into wallets (user_id) values (new.user_id);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_profile_created
after insert on profiles
for each row execute procedure create_wallet_for_new_user();

-- Enable realtime for wallets
ALTER PUBLICATION supabase_realtime ADD TABLE public.wallets;
