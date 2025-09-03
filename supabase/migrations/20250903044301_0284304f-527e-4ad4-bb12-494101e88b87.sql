-- Manually activate the lifetime subscription for the user who paid
INSERT INTO user_subscriptions (
  user_id,
  status,
  stripe_customer_id,
  current_period_end,
  cancel_at_period_end,
  created_at,
  updated_at
) VALUES (
  '95267b69-2f36-4f2e-a620-903100b05c5f',
  'active',
  'mercado_pago_124124853839',
  NULL,
  false,
  now(),
  now()
) ON CONFLICT (user_id) DO UPDATE SET
  status = 'active',
  stripe_customer_id = 'mercado_pago_124124853839',
  current_period_end = NULL,
  cancel_at_period_end = false,
  updated_at = now();