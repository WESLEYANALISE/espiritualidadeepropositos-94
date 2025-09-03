-- Inserir a assinatura vitalícia para o usuário Wes@gmail.com
DO $$
DECLARE
  v_user_id UUID;
  v_plan_id UUID := '55b2f87e-8673-437e-93d7-bb94d35efdf5'::UUID;
BEGIN
  -- Buscar o ID do usuário
  SELECT id INTO v_user_id 
  FROM auth.users 
  WHERE email = 'Wes@gmail.com';
  
  IF v_user_id IS NOT NULL THEN
    -- Deletar registros existentes se houver
    DELETE FROM user_subscriptions WHERE user_id = v_user_id;
    
    -- Inserir nova assinatura vitalícia
    INSERT INTO user_subscriptions (
      user_id,
      plan_id,
      stripe_subscription_id,
      stripe_customer_id,
      status,
      current_period_end,
      current_period_start,
      cancel_at_period_end
    ) VALUES (
      v_user_id,
      v_plan_id,
      'mercado_pago_lifetime_manual',
      'mercado_pago_lifetime_wes',
      'active',
      '2125-01-01'::timestamptz,
      now(),
      false
    );
    
    RAISE NOTICE 'Assinatura vitalícia criada para o usuário %', v_user_id;
  ELSE
    RAISE NOTICE 'Usuário não encontrado';
  END IF;
END $$;