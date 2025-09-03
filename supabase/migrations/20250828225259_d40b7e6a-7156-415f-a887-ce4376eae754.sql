
-- 1) Tabela de assinantes
CREATE TABLE IF NOT EXISTS public.subscribers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  subscribed BOOLEAN NOT NULL DEFAULT false,
  subscription_tier TEXT,
  subscription_end TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.subscribers ENABLE ROW LEVEL SECURITY;

-- Usuário pode ver seu próprio registro de assinatura
CREATE POLICY IF NOT EXISTS "select_own_subscription"
ON public.subscribers
FOR SELECT
USING (user_id = auth.uid() OR email = auth.email());

-- Usuário pode inserir/atualizar seu próprio registro (edge functions com service role também conseguem)
CREATE POLICY IF NOT EXISTS "insert_own_subscription"
ON public.subscribers
FOR INSERT
WITH CHECK (user_id = auth.uid() OR email = auth.email());

CREATE POLICY IF NOT EXISTS "update_own_subscription"
ON public.subscribers
FOR UPDATE
USING (user_id = auth.uid() OR email = auth.email());


-- 2) Tabela de anotações por usuário e livro
CREATE TABLE IF NOT EXISTS public.user_book_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id BIGINT NOT NULL,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_book_notes ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_book_notes_user ON public.user_book_notes (user_id);
CREATE INDEX IF NOT EXISTS idx_user_book_notes_book ON public.user_book_notes (book_id);

-- RLS: somente o dono acessa
CREATE POLICY IF NOT EXISTS "select_own_notes"
ON public.user_book_notes
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "insert_own_notes"
ON public.user_book_notes
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "update_own_notes"
ON public.user_book_notes
FOR UPDATE
USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "delete_own_notes"
ON public.user_book_notes
FOR DELETE
USING (user_id = auth.uid());

-- Trigger para manter updated_at
DROP TRIGGER IF EXISTS trg_user_book_notes_updated_at ON public.user_book_notes;
CREATE TRIGGER trg_user_book_notes_updated_at
BEFORE UPDATE ON public.user_book_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_modified_column();


-- 3) Tabela de favoritos por usuário
CREATE TABLE IF NOT EXISTS public.user_favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id BIGINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

ALTER TABLE public.user_favorites ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_user_favorites_user ON public.user_favorites (user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_book ON public.user_favorites (book_id);

CREATE POLICY IF NOT EXISTS "select_own_favorites"
ON public.user_favorites
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "insert_own_favorites"
ON public.user_favorites
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "delete_own_favorites"
ON public.user_favorites
FOR DELETE
USING (user_id = auth.uid());


-- 4) Controle do livro gratuito por dia com espera de 30s
CREATE TABLE IF NOT EXISTS public.daily_free_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  book_id BIGINT NOT NULL,
  read_date DATE NOT NULL DEFAULT CURRENT_DATE,
  waited_seconds INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, read_date)
);

ALTER TABLE public.daily_free_reads ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_daily_free_reads_user ON public.daily_free_reads (user_id);
CREATE INDEX IF NOT EXISTS idx_daily_free_reads_date ON public.daily_free_reads (read_date);

CREATE POLICY IF NOT EXISTS "select_own_daily_read"
ON public.daily_free_reads
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "insert_own_daily_read"
ON public.daily_free_reads
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "update_own_daily_read"
ON public.daily_free_reads
FOR UPDATE
USING (user_id = auth.uid());
