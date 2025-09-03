-- Adicionar constraint UNIQUE no user_id da tabela user_subscriptions para permitir upsert
ALTER TABLE user_subscriptions 
ADD CONSTRAINT user_subscriptions_user_id_unique UNIQUE (user_id);

-- Verificar se a constraint foi criada corretamente
SELECT constraint_name, constraint_type, table_name 
FROM information_schema.table_constraints 
WHERE table_name = 'user_subscriptions' AND constraint_type = 'UNIQUE';