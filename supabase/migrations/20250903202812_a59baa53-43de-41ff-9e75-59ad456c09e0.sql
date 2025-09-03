-- Criar assinatura vitalícia para o usuário weslewwyhard@gmail.com
INSERT INTO user_subscriptions (
  user_id, 
  stripe_customer_id, 
  stripe_subscription_id, 
  status, 
  plan_id,
  current_period_end,
  cancel_at_period_end,
  created_at,
  updated_at
) VALUES (
  'd57575b0-f651-4919-b125-a2b2cb6912a8',  -- ID do usuário weslewwyhard@gmail.com
  'pix_lifetime_' || extract(epoch from now())::text,  -- Customer ID único para PIX
  'pix_payment_' || extract(epoch from now())::text,   -- Subscription ID único
  'active',
  '55b2f87e-8673-437e-93d7-bb94d35efdf5',  -- Usar o mesmo plan_id do outro usuário
  '2125-09-03 14:24:39.604+00',             -- Data muito no futuro (100 anos)
  false,
  now(),
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  stripe_customer_id = EXCLUDED.stripe_customer_id,
  status = 'active',
  current_period_end = '2125-09-03 14:24:39.604+00',
  updated_at = now();