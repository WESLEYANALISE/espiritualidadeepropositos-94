import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PaymentVerificationResult {
  payment_id: string;
  status: string;
  isPaid: boolean;
  plan: string;
  transaction_amount?: number;
  date_approved?: string;
}

export const usePaymentVerification = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, checkSubscription } = useAuth();

  const verifyPayment = useCallback(async (paymentId?: string): Promise<PaymentVerificationResult | null> => {
    setLoading(true);
    setError(null);

    try {
      console.log('Verificando pagamento:', { paymentId, userId: user?.id });
      
      const { data, error } = await supabase.functions.invoke('payment-verify', {
        body: {
          payment_id: paymentId,
          user_id: user?.id
        }
      });

      console.log('Resultado da verificação:', { data, error });

      if (error) {
        throw new Error(error.message);
      }

      // Atualizar o contexto de autenticação se o pagamento foi aprovado
      if (data?.isPaid) {
        await checkSubscription();
      }

      return data;
    } catch (err: any) {
      const errorMessage = err.message || 'Erro ao verificar pagamento';
      setError(errorMessage);
      console.error('Payment verification error:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user?.id, checkSubscription]);

  const restoreAccess = useCallback(async (): Promise<boolean> => {
    if (!user?.id) {
      setError('Usuário não autenticado');
      return false;
    }

    const result = await verifyPayment();
    return result?.isPaid || false;
  }, [user?.id, verifyPayment]);

  return {
    verifyPayment,
    restoreAccess,
    loading,
    error,
    clearError: () => setError(null)
  };
};