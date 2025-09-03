-- Create user_subscriptions table to track lifetime licenses
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_type TEXT NOT NULL DEFAULT 'lifetime',
  status TEXT NOT NULL DEFAULT 'active',
  payment_method TEXT DEFAULT 'mercado_pago_pix',
  payment_id TEXT,
  amount DECIMAL(10,2),
  currency TEXT DEFAULT 'BRL',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE, -- NULL for lifetime
  
  UNIQUE(user_id, subscription_type)
);

-- Enable RLS
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own subscriptions" 
ON public.user_subscriptions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can insert subscriptions" 
ON public.user_subscriptions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update subscriptions" 
ON public.user_subscriptions 
FOR UPDATE 
USING (true);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION public.update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
BEFORE UPDATE ON public.user_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_user_subscriptions_updated_at();