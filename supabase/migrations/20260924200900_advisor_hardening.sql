create index if not exists api_keys_created_by_idx on public.api_keys(created_by);
create index if not exists api_keys_merchant_id_idx on public.api_keys(merchant_id);
create index if not exists ledger_entries_merchant_id_idx on public.ledger_entries(merchant_id);
create index if not exists merchant_members_user_id_idx on public.merchant_members(user_id);
create index if not exists merchants_owner_user_id_idx on public.merchants(owner_user_id);
create index if not exists payment_transactions_created_by_idx on public.payment_transactions(created_by);
create index if not exists webhook_events_transaction_id_idx on public.webhook_events(transaction_id);

drop policy if exists members_admin_manage on public.merchant_members;
create policy members_admin_insert on public.merchant_members for insert to authenticated
with check((select private.has_merchant_role(merchant_id,array['owner','admin']::public.merchant_role[])));
create policy members_admin_update on public.merchant_members for update to authenticated
using((select private.has_merchant_role(merchant_id,array['owner','admin']::public.merchant_role[])))
with check((select private.has_merchant_role(merchant_id,array['owner','admin']::public.merchant_role[])));
create policy members_admin_delete on public.merchant_members for delete to authenticated
using((select private.has_merchant_role(merchant_id,array['owner','admin']::public.merchant_role[])));
create policy webhook_events_deny_clients on public.webhook_events for all to authenticated using(false) with check(false);
