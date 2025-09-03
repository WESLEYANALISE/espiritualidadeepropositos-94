-- Manually activate the lifetime subscription for the user who paid
INSERT INTO user_subscriptions (
  user_id,
  subscription_type,
  status,
  payment_method,
  payment_id,
  amount,
  currency,
  expires_at,
  created_at,
  updated_at
) VALUES (
  '95267b69-2f36-4f2e-a620-903100b05c5f',
  'lifetime',
  'active',
  'mercado_pago_pix',
  '124124853839',
  9.00,
  'BRL',
  NULL,
  now(),
  now()
) ON CONFLICT (user_id, subscription_type) DO UPDATE SET
  status = 'active',
  payment_method = 'mercado_pago_pix',
  payment_id = '124124853839',
  amount = 9.00,
  currency = 'BRL',
  updated_at = now();