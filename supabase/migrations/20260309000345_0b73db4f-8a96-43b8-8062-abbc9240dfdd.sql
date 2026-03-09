
create or replace function create_wallet_for_new_user()
returns trigger as $$
begin
  insert into wallets (user_id) values (new.user_id);
  return new;
end;
$$ language plpgsql security definer set search_path = public;
