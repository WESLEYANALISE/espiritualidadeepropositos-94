-- Primeiro, vamos inserir a assinatura vitalícia para o usuário Wes@gmail.com
INSERT INTO user_subscriptions (
  user_id,
  plan_id,
  stripe_subscription_id,
  stripe_customer_id,
  status,
  current_period_end,
  cancel_at_period_end
)
SELECT 
  u.id as user_id,
  '55b2f87e-8673-437e-93d7-bb94d35efdf5'::uuid as plan_id,
  'mercado_pago_lifetime_manual' as stripe_subscription_id,
  'mercado_pago_lifetime_wes' as stripe_customer_id,
  'active' as status,
  '2125-01-01'::timestamptz as current_period_end,
  false as cancel_at_period_end
FROM auth.users u
WHERE u.email = 'Wes@gmail.com'
ON CONFLICT (user_id) 
DO UPDATE SET
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  stripe_subscription_id = EXCLUDED.stripe_subscription_id,
  status = EXCLUDED.status,
  current_period_end = EXCLUDED.current_period_end,
  updated_at = now();