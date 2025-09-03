
-- Corrigir a estrutura da tabela payment_requests para alinhar com as Edge Functions PIX

-- 1) Criar tabela se não existir (estrutura segura e mínima)
CREATE TABLE IF NOT EXISTS public.payment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_id TEXT,
  mp_payment_id TEXT,
  amount NUMERIC,
  currency TEXT,
  source TEXT,
  status TEXT, -- e.g. 'pending', 'paid', 'failed'
  raw JSONB,
  webhook_data JSONB,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2) Adicionar colunas ausentes, caso a tabela já exista mas sem todos os campos
ALTER TABLE public.payment_requests
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS payment_id TEXT,
  ADD COLUMN IF NOT EXISTS mp_payment_id TEXT,
  ADD COLUMN IF NOT EXISTS amount NUMERIC,
  ADD COLUMN IF NOT EXISTS currency TEXT,
  ADD COLUMN IF NOT EXISTS source TEXT,
  ADD COLUMN IF NOT EXISTS status TEXT,
  ADD COLUMN IF NOT EXISTS raw JSONB,
  ADD COLUMN IF NOT EXISTS webhook_data JSONB,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- 3) Índice único para permitir upsert por mp_payment_id (usado nas functions)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public' AND indexname = 'payment_requests_mp_payment_id_key'
  ) THEN
    CREATE UNIQUE INDEX payment_requests_mp_payment_id_key
      ON public.payment_requests (mp_payment_id);
  END IF;
END $$;

-- 4) Trigger para manter updated_at em updates (a função update_modified_column já existe no seu projeto)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_payment_requests_updated_at'
  ) THEN
    CREATE TRIGGER trg_payment_requests_updated_at
    BEFORE UPDATE ON public.payment_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_modified_column();
  END IF;
END $$;
