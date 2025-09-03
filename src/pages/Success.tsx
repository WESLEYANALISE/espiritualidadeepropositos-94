import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, RefreshCw, AlertTriangle, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { usePaymentVerification } from '@/hooks/usePaymentVerification';
import { useToast } from '@/hooks/use-toast';

export default function Success() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, subscription } = useAuth();
  const { verifyPayment, restoreAccess, loading, error } = usePaymentVerification();
  const { toast } = useToast();
  const [verificationStatus, setVerificationStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle');

  // Extrair payment_id da URL se disponível
  const paymentId = searchParams.get('payment_id') || searchParams.get('collection_id');

  useEffect(() => {
    // Verificar automaticamente se temos um payment_id ou se o usuário não tem assinatura ativa
    if ((paymentId || !subscription.subscribed) && user) {
      handleVerifyPayment();
    }
  }, [paymentId, user, subscription.subscribed]);

  const handleVerifyPayment = async () => {
    setVerificationStatus('verifying');
    
    const result = await verifyPayment(paymentId || undefined);
    
    if (result?.isPaid) {
      setVerificationStatus('success');
      toast({
        title: "Pagamento confirmado!",
        description: "Sua assinatura vitalícia foi ativada com sucesso.",
      });
    } else if (result) {
      setVerificationStatus('error');
      toast({
        title: "Pagamento pendente",
        description: `Status: ${result.status}. Aguarde a confirmação do pagamento.`,
        variant: "destructive",
      });
    } else {
      setVerificationStatus('error');
    }
  };

  const handleRestoreAccess = async () => {
    const success = await restoreAccess();
    
    if (success) {
      toast({
        title: "Acesso restaurado!",
        description: "Sua assinatura vitalícia foi encontrada e ativada.",
      });
      setVerificationStatus('success');
    } else {
      toast({
        title: "Nenhum pagamento encontrado",
        description: "Não encontramos nenhum pagamento aprovado para seu usuário.",
        variant: "destructive",
      });
    }
  };

  const isLifetimeActive = subscription.subscribed && subscription.subscription_tier === 'vitalício';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-gradient-card border-primary/30 shadow-luxury">
        <CardHeader className="text-center space-y-4">
          {isLifetimeActive || verificationStatus === 'success' ? (
            <>
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Tudo Desbloqueado!
                </CardTitle>
                <CardDescription>
                  Sua assinatura vitalícia está ativa. Aproveite todos os recursos premium!
                </CardDescription>
              </div>
            </>
          ) : verificationStatus === 'verifying' || loading ? (
            <>
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                <RefreshCw className="h-8 w-8 text-blue-600 animate-spin" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-blue-700">
                  Verificando Pagamento
                </CardTitle>
                <CardDescription>
                  Aguarde enquanto confirmamos seu pagamento...
                </CardDescription>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto">
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-yellow-700">
                  Pagamento Pendente
                </CardTitle>
                <CardDescription>
                  Aguardando confirmação do seu pagamento PIX
                </CardDescription>
              </div>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {paymentId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-sm text-blue-600">
                <strong>ID do Pagamento:</strong> {paymentId}
              </p>
            </div>
          )}

          {isLifetimeActive && (
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Crown className="h-5 w-5" />
                <span className="font-medium">Acesso Premium Ativado</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Agora você pode aproveitar todos os benefícios da sua assinatura
              </p>
            </div>
          )}

          <div className="space-y-2">
            {!isLifetimeActive && (
              <>
                <Button 
                  onClick={handleVerifyPayment}
                  disabled={loading || verificationStatus === 'verifying'}
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Verificando...
                    </>
                  ) : (
                    'Verificar Pagamento'
                  )}
                </Button>

                <Button 
                  variant="outline" 
                  onClick={handleRestoreAccess}
                  disabled={loading}
                  className="w-full"
                >
                  Restaurar Acesso
                </Button>
              </>
            )}

            <Button 
              onClick={() => navigate('/')}
              className={isLifetimeActive ? "w-full bg-gradient-primary hover:shadow-glow transition-all duration-300" : "w-full"}
              variant={isLifetimeActive ? "default" : "secondary"}
            >
              {isLifetimeActive ? "Usar o app" : "Ir para o App"}
            </Button>

            {isLifetimeActive && (
              <Button 
                variant="outline"
                onClick={() => navigate('/assinaturas')}
                className="w-full"
              >
                Ver Minha Assinatura
              </Button>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>
              {isLifetimeActive 
                ? "Você receberá um e-mail de confirmação em breve. Se tiver dúvidas, entre em contato conosco."
                : "O PIX pode levar alguns minutos para ser processado. Você pode verificar novamente em instantes."
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}