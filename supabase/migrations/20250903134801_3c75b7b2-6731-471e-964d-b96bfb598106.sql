-- Corrigir registros existentes do Mercado Pago que não têm o formato correto
UPDATE user_subscriptions 
SET stripe_customer_id = 'mercado_pago_lifetime_' || stripe_subscription_id 
WHERE stripe_customer_id = 'mercado_pago_lifetime' 
  AND stripe_subscription_id IS NOT NULL;

-- Corrigir registros do Abacate Pay também
UPDATE user_subscriptions 
SET stripe_customer_id = 'abacate_pay_lifetime_' || stripe_subscription_id 
WHERE stripe_customer_id LIKE 'abacate_pay_lifetime' 
  AND stripe_customer_id NOT LIKE 'abacate_pay_lifetime_%'
  AND stripe_subscription_id IS NOT NULL;