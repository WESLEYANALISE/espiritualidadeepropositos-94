
-- 1) Tabela para rastrear pedidos PIX (permite reconciliação automática)
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  payment_id text unique,
  amount numeric(10,2) not null,
  currency text not null default 'BRL',
  source text not null default 'mercado_pago_pix',
  status text not null default 'pending', -- pending | paid | failed
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  webhook_data jsonb
);

alter table public.payment_requests enable row level security;

-- Usuário pode ver seus próprios pedidos
create policy if not exists "Users can view own payment_requests"
  on public.payment_requests
  for select
  using (auth.uid() = user_id);

-- Edge functions (service role) podem inserir
create policy if not exists "Edge functions can insert payment_requests"
  on public.payment_requests
  for insert
  with check (true);

-- Edge functions (service role) podem atualizar
create policy if not exists "Edge functions can update payment_requests"
  on public.payment_requests
  for update
  using (true);

-- 2) Garantir índice único em user_subscriptions(user_id) para upsert por conflito em 'user_id'
create unique index if not exists idx_user_subscriptions_user_id_unique
  on public.user_subscriptions(user_id);

-- 3) Backfill de validade longa (100 anos) para assinaturas Mercado Pago sem data coerente
update public.user_subscriptions
set current_period_end = (now() + interval '100 years')::timestamptz,
    cancel_at_period_end = false
where stripe_customer_id like 'mercado_pago%'
  and status = 'active'
  and (current_period_end is null or current_period_end < now() + interval '50 years');

-- 4) Visão administrativa de contas vitalícias
create or replace view public.lifetime_accounts as
select
  us.user_id,
  us.status,
  us.stripe_customer_id,
  us.stripe_subscription_id,
  us.current_period_end,
  us.created_at,
  us.updated_at
from public.user_subscriptions us
where us.status = 'active'
  and (us.current_period_end is null or us.current_period_end > now())
  and us.stripe_customer_id like 'mercado_pago%';
