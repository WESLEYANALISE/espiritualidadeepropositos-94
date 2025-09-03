-- Ativar licença vitalícia para usuários que já pagaram mas não estão como premium
-- Baseado nos logs do Mercado Pago que mostram pagamentos aprovados

-- 1. Ativar especificamente o usuário wes@gmail.com que já pagou
INSERT INTO public.user_subscriptions (
  user_id,
  plan_id,
  status,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_end,
  cancel_at_period_end
)
SELECT 
  au.id,
  (SELECT id FROM subscription_plans WHERE name = 'Premium' LIMIT 1),
  'active',
  'mercado_pago_lifetime_manual_activation',
  'manual_activation_' || au.id,
  (now() + interval '100 years')::timestamptz,
  false
FROM auth.users au
WHERE au.email = 'wes@gmail.com'
  AND NOT EXISTS (
    SELECT 1 FROM user_subscriptions us 
    WHERE us.user_id = au.id AND us.status = 'active'
  )
ON CONFLICT (user_id) 
DO UPDATE SET
  status = 'active',
  stripe_customer_id = 'mercado_pago_lifetime_manual_activation',
  current_period_end = (now() + interval '100 years')::timestamptz,
  cancel_at_period_end = false,
  updated_at = now();

-- 2. Ativar outros usuários que têm registros no payment_requests mas não têm assinatura ativa
INSERT INTO public.user_subscriptions (
  user_id,
  plan_id,
  status,
  stripe_customer_id,
  stripe_subscription_id,
  current_period_end,
  cancel_at_period_end
)
SELECT 
  pr.user_id,
  (SELECT id FROM subscription_plans WHERE name = 'Premium' LIMIT 1),
  'active',
  'mercado_pago_lifetime_' || pr.payment_id,
  pr.payment_id,
  (now() + interval '100 years')::timestamptz,
  false
FROM payment_requests pr
WHERE pr.status = 'paid'
  AND NOT EXISTS (
    SELECT 1 FROM user_subscriptions us 
    WHERE us.user_id = pr.user_id AND us.status = 'active'
  )
ON CONFLICT (user_id) 
DO UPDATE SET
  status = 'active',
  stripe_customer_id = 'mercado_pago_lifetime_' || excluded.stripe_subscription_id,
  current_period_end = (now() + interval '100 years')::timestamptz,
  cancel_at_period_end = false,
  updated_at = now();