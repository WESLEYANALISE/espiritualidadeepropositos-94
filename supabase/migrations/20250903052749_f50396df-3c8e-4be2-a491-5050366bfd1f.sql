-- Update existing user subscriptions for users who paid via Mercado Pago to have proper lifetime expiration
UPDATE user_subscriptions 
SET current_period_end = (NOW() + INTERVAL '100 years')::timestamp with time zone,
    updated_at = NOW()
WHERE stripe_customer_id LIKE 'mercado_pago%' 
   AND (current_period_end IS NULL OR current_period_end < NOW() + INTERVAL '50 years');