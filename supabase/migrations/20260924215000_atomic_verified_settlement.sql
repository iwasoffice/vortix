create or replace function public.settle_verified_transaction(
  p_transaction_id uuid,
  p_verified_amount_minor bigint,
  p_verified_currency text,
  p_payload jsonb default '{}'::jsonb
) returns public.payment_transactions
language plpgsql security definer set search_path = ''
as $$
declare tx public.payment_transactions%rowtype;
begin
  select * into tx from public.payment_transactions where id=p_transaction_id for update;
  if not found then raise exception 'transaction not found'; end if;
  if tx.status='succeeded' then return tx; end if;
  if tx.status not in ('pending','processing') then raise exception 'invalid settlement state: %',tx.status; end if;
  if tx.amount_minor<>p_verified_amount_minor then raise exception 'verified amount mismatch'; end if;
  if upper(tx.currency)<>upper(p_verified_currency) then raise exception 'verified currency mismatch'; end if;
  insert into public.ledger_entries(merchant_id,transaction_id,account,direction,amount_minor,currency)
  values
    (tx.merchant_id,tx.id,'processor_clearing','debit',tx.amount_minor,tx.currency),
    (tx.merchant_id,tx.id,'merchant_payable','credit',tx.amount_minor,tx.currency)
  on conflict (transaction_id,account) do nothing;
  update public.payment_transactions set status='succeeded',failure_code=null,failure_message=null,updated_at=now()
  where id=tx.id returning * into tx;
  insert into public.transaction_events(transaction_id,type,detail,payload)
  values(tx.id,'succeeded','Provider verification passed; payment settled',p_payload);
  return tx;
end $$;

create or replace function public.fail_verified_transaction(
  p_transaction_id uuid,p_code text,p_message text,p_payload jsonb default '{}'::jsonb
) returns public.payment_transactions
language plpgsql security definer set search_path = ''
as $$
declare tx public.payment_transactions%rowtype;
begin
  select * into tx from public.payment_transactions where id=p_transaction_id for update;
  if not found then raise exception 'transaction not found'; end if;
  if tx.status='succeeded' then raise exception 'cannot fail a settled transaction'; end if;
  update public.payment_transactions set status='failed',failure_code=p_code,failure_message=p_message,updated_at=now()
  where id=tx.id returning * into tx;
  insert into public.transaction_events(transaction_id,type,detail,payload)
  values(tx.id,'failed',p_message,p_payload);
  return tx;
end $$;

revoke all on function public.settle_verified_transaction(uuid,bigint,text,jsonb) from public,anon,authenticated;
revoke all on function public.fail_verified_transaction(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.settle_verified_transaction(uuid,bigint,text,jsonb) to service_role;
grant execute on function public.fail_verified_transaction(uuid,text,text,jsonb) to service_role;
