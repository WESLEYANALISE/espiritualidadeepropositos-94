-- Manually activate the lifetime subscription for the user who paid
INSERT INTO user_subscriptions (
  user_id,
  status,
  created_at,
  updated_at
) VALUES (
  '95267b69-2f36-4f2e-a620-903100b05c5f',
  'active',
  now(),
  now()
);