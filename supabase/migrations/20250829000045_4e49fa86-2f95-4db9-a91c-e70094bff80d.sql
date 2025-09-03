-- Criar tabela subscribers para gerenciar assinaturas
CREATE TABLE public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Habilitar Row Level Security
ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Políticas para usuários verem suas próprias assinaturas
CREATE POLICY "select_own_subscription" ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

-- Políticas para edge functions gerenciarem assinaturas
CREATE POLICY "manage_subscriptions" ON public.subscribers
FOR ALL
USING (true)
WITH CHECK (true);