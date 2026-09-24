create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

do $$ begin create type public.merchant_role as enum ('owner','admin','developer','analyst','viewer'); exception when duplicate_object then null; end $$;
do $$ begin create type public.transaction_status as enum ('initiated','requires_review','pending','processing','succeeded','failed','cancelled','refunded'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_provider as enum ('paystack','flutterwave','monnify'); exception when duplicate_object then null; end $$;
do $$ begin create type public.ledger_direction as enum ('debit','credit'); exception when duplicate_object then null; end $$;

create table if not exists public.profiles(
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text, company_name text, phone text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.merchants(
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique,
  owner_user_id uuid not null references auth.users(id) on delete restrict,
  status text not null default 'active' check(status in('active','suspended','closed')),
  settlement_currency text not null default 'NGN',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.merchant_members(
  merchant_id uuid not null references public.merchants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.merchant_role not null default 'viewer', created_at timestamptz not null default now(),
  primary key(merchant_id,user_id)
);
create table if not exists public.api_keys(
  id uuid primary key default gen_random_uuid(), merchant_id uuid not null references public.merchants(id) on delete cascade,
  name text not null, key_prefix text not null, key_hash text not null unique,
  created_by uuid not null references auth.users(id), last_used_at timestamptz, revoked_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.payment_transactions(
  id uuid primary key default gen_random_uuid(), merchant_id uuid not null references public.merchants(id) on delete restrict,
  created_by uuid references auth.users(id) on delete set null, reference text not null unique, idempotency_key text,
  customer_reference text not null, customer_email text, amount_minor bigint not null check(amount_minor>0),
  currency text not null check(char_length(currency)=3), status public.transaction_status not null default 'initiated',
  provider public.payment_provider, provider_reference text, authorization_url text,
  risk_score int not null default 0 check(risk_score between 0 and 100), risk_level text not null default 'low',
  risk_reasons jsonb not null default '[]'::jsonb, route_reason text, metadata jsonb not null default '{}'::jsonb,
  failure_code text, failure_message text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(merchant_id,idempotency_key)
);
create unique index if not exists payment_transactions_provider_ref_idx on public.payment_transactions(provider,provider_reference) where provider_reference is not null;
create index if not exists payment_transactions_merchant_created_idx on public.payment_transactions(merchant_id,created_at desc);
create index if not exists payment_transactions_status_idx on public.payment_transactions(status,created_at desc);
create table if not exists public.transaction_events(
  id uuid primary key default gen_random_uuid(), transaction_id uuid not null references public.payment_transactions(id) on delete cascade,
  type text not null, detail text not null, payload jsonb, created_at timestamptz not null default now()
);
create index if not exists transaction_events_tx_created_idx on public.transaction_events(transaction_id,created_at);
create table if not exists public.ledger_entries(
  id uuid primary key default gen_random_uuid(), merchant_id uuid not null references public.merchants(id) on delete restrict,
  transaction_id uuid not null references public.payment_transactions(id) on delete restrict, account text not null,
  direction public.ledger_direction not null, amount_minor bigint not null check(amount_minor>=0), currency text not null,
  created_at timestamptz not null default now(), unique(transaction_id,account)
);
create table if not exists public.webhook_events(
  id uuid primary key default gen_random_uuid(), provider public.payment_provider not null, provider_event_id text not null,
  event_type text not null, transaction_id uuid references public.payment_transactions(id) on delete set null,
  state text not null default 'received', payload jsonb not null, error_message text,
  received_at timestamptz not null default now(), processed_at timestamptz, unique(provider,provider_event_id)
);

create or replace function private.has_merchant_role(p_merchant uuid,p_roles public.merchant_role[] default null)
returns boolean language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.merchant_members m where m.merchant_id=p_merchant and m.user_id=(select auth.uid()) and (p_roles is null or m.role=any(p_roles)));
$$;
revoke all on function private.has_merchant_role(uuid,public.merchant_role[]) from public;
grant execute on function private.has_merchant_role(uuid,public.merchant_role[]) to authenticated;

alter table public.profiles enable row level security;
alter table public.merchants enable row level security;
alter table public.merchant_members enable row level security;
alter table public.api_keys enable row level security;
alter table public.payment_transactions enable row level security;
alter table public.transaction_events enable row level security;
alter table public.ledger_entries enable row level security;
alter table public.webhook_events enable row level security;

create policy profile_select_self on public.profiles for select to authenticated using((select auth.uid())=id);
create policy profile_update_self on public.profiles for update to authenticated using((select auth.uid())=id) with check((select auth.uid())=id);
create policy merchants_member_select on public.merchants for select to authenticated using((select private.has_merchant_role(id,null)));
create policy merchants_admin_update on public.merchants for update to authenticated using((select private.has_merchant_role(id,array['owner','admin']::public.merchant_role[]))) with check((select private.has_merchant_role(id,array['owner','admin']::public.merchant_role[])));
create policy members_member_select on public.merchant_members for select to authenticated using((select private.has_merchant_role(merchant_id,null)));
create policy members_admin_manage on public.merchant_members for all to authenticated using((select private.has_merchant_role(merchant_id,array['owner','admin']::public.merchant_role[]))) with check((select private.has_merchant_role(merchant_id,array['owner','admin']::public.merchant_role[])));
create policy api_keys_admin_select on public.api_keys for select to authenticated using((select private.has_merchant_role(merchant_id,array['owner','admin','developer']::public.merchant_role[])));
create policy api_keys_admin_insert on public.api_keys for insert to authenticated with check((select private.has_merchant_role(merchant_id,array['owner','admin']::public.merchant_role[])) and created_by=(select auth.uid()));
create policy api_keys_admin_update on public.api_keys for update to authenticated using((select private.has_merchant_role(merchant_id,array['owner','admin']::public.merchant_role[]))) with check((select private.has_merchant_role(merchant_id,array['owner','admin']::public.merchant_role[])));
create policy tx_member_select on public.payment_transactions for select to authenticated using((select private.has_merchant_role(merchant_id,null)));
create policy tx_operator_insert on public.payment_transactions for insert to authenticated with check((select private.has_merchant_role(merchant_id,array['owner','admin','developer']::public.merchant_role[])) and created_by=(select auth.uid()));
create policy tx_operator_update on public.payment_transactions for update to authenticated using((select private.has_merchant_role(merchant_id,array['owner','admin','developer']::public.merchant_role[]))) with check((select private.has_merchant_role(merchant_id,array['owner','admin','developer']::public.merchant_role[])));
create policy events_member_select on public.transaction_events for select to authenticated using(exists(select 1 from public.payment_transactions t where t.id=transaction_id and (select private.has_merchant_role(t.merchant_id,null))));
create policy ledger_member_select on public.ledger_entries for select to authenticated using((select private.has_merchant_role(merchant_id,null)));

revoke all on public.webhook_events from anon,authenticated;
grant select,update on public.profiles to authenticated;
grant select,update on public.merchants to authenticated;
grant select,insert,update,delete on public.merchant_members to authenticated;
grant select,insert,update on public.api_keys to authenticated;
grant select,insert,update on public.payment_transactions to authenticated;
grant select on public.transaction_events,public.ledger_entries to authenticated;

create or replace function private.handle_new_user() returns trigger language plpgsql security definer set search_path='' as $$
declare mid uuid:=gen_random_uuid(); display_name text; merchant_name text;
begin
  display_name:=coalesce(nullif(new.raw_user_meta_data->>'full_name',''),split_part(new.email,'@',1));
  merchant_name:=coalesce(nullif(new.raw_user_meta_data->>'company_name',''),display_name||'''s Workspace');
  insert into public.profiles(id,full_name,company_name) values(new.id,display_name,new.raw_user_meta_data->>'company_name');
  insert into public.merchants(id,name,slug,owner_user_id) values(mid,merchant_name,'vortix-'||substr(replace(new.id::text,'-',''),1,12),new.id);
  insert into public.merchant_members(merchant_id,user_id,role) values(mid,new.id,'owner');
  return new;
end $$;
revoke all on function private.handle_new_user() from public,anon,authenticated;
create trigger on_auth_user_created_vortix after insert on auth.users for each row execute function private.handle_new_user();
