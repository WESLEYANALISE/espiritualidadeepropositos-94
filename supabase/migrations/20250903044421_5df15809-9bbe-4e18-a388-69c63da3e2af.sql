-- Manually activate the lifetime subscription for the user who paid via Mercado Pago
INSERT INTO user_subscriptions (
  user_id,
  plan_id,
  stripe_subscription_id,
  stripe_customer_id,
  status,
  created_at,
  updated_at
) VALUES (
  '95267b69-2f36-4f2e-a620-903100b05c5f',
  '55b2f87e-8673-437e-93d7-bb94d35efdf5',
  'mercado_pago_124124853839',
  'mercado_pago_lifetime',
  'active',
  now(),
  now()
);