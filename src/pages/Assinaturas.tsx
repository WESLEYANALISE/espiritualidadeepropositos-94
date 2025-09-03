import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Check, Loader2, Settings, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import PixPaymentModal from '@/components/PixPaymentModal';

export default function Assinaturas() {
  const { user, subscription, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);
  const [showPixModal, setShowPixModal] = useState(false);

  const handleBuyLifetime = () => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para comprar a licença vitalícia.',
        variant: 'destructive',
      });
      return;
    }

    setShowPixModal(true);
  };

  const handleManageSubscription = async () => {
    if (!user) return;

    toast({
      title: 'Gerenciamento de assinatura',
      description: 'Para suporte ou cancelamento, entre em contato conosco pelo email: contato@seudominio.com',
    });
  };

  const handleRefreshSubscription = async () => {
    setLoading('refresh');
    try {
      // First call refresh-subscription to reconcile pending payments
      const { data, error } = await supabase.functions.invoke('refresh-subscription');
      console.log('Refresh subscription result:', data, error);
      
      // Then check subscription status
      await checkSubscription();
      toast({
        title: 'Status atualizado',
        description: 'Status da assinatura foi atualizado.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status.',
        variant: 'destructive',
      });
    } finally {
      setLoading(null);
    }
  };

  // Auto-refresh on page load
  useEffect(() => {
    if (user) {
      handleRefreshSubscription();
    }
  }, [user]);

  return (
    <div className="min-h-screen bg-background pt-6 pb-20">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Botão Voltar */}
        <div className="mb-6">
          <Button 
            onClick={() => window.history.back()}
            variant="outline"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
        
        <div className="text-center mb-6">
              <Button 
                onClick={() => window.location.reload()}
                className="bg-gradient-primary mb-4"
              >
                🔄 Atualizar Status da Assinatura
              </Button>
            </div>

        {/* Current Subscription Status */}
        {user && (
          <Card className="mb-6 bg-gradient-card border-primary/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Crown className="h-5 w-5 text-primary" />
                Status da Assinatura
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground font-medium">
                    {subscription.subscribed ? (
                      <>Status: <span className="text-primary">✅ Ativo ({subscription.subscription_tier})</span></>
                    ) : (
                      <>Status: <span className="text-muted-foreground">⭕ Gratuito</span></>
                    )}
                  </p>
                  {subscription.subscription_end && (
                    <p className="text-sm text-muted-foreground">
                      Válido até: {new Date(subscription.subscription_end).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshSubscription}
                    disabled={loading === 'refresh'}
                  >
                    {loading === 'refresh' ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Atualizar'
                    )}
                  </Button>
                  {subscription.subscribed && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManageSubscription}
                    >
                      <Settings className="h-4 w-4 mr-1" />
                      Suporte
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 max-w-2xl mx-auto">
          {/* Basic Plan */}
          <Card className="bg-gradient-card border-primary/40 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-primary"></div>
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-foreground text-lg">💎 Acesso Total</CardTitle>
              <div className="text-2xl font-bold text-primary">R$ 9,00</div>
              <div className="bg-gradient-primary text-primary-foreground px-3 py-1 rounded-full text-xs font-medium inline-block">
                ⚡ PAGAMENTO ÚNICO
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">🚀 Leitura sem espera</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">📚 Livros ilimitados</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">🚫 Sem anúncios</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">🤖 Acesso à Luna IA</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">📱 Download PDF offline</span>
                </div>
              </div>
              <Button 
                onClick={handleBuyLifetime}
                disabled={subscription.subscribed}
                className="w-full bg-gradient-primary hover:shadow-glow text-primary-foreground font-medium flex items-center gap-2"
              >
                {subscription.subscribed ? (
                  '✅ Licença Ativa'
                ) : (
                  <>
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                    </svg>
                    PIX - Comprar Licença Vitalícia
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Free Plan */}
          <Card className="bg-gradient-surface border-border opacity-75">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-muted-foreground text-lg">Gratuito</CardTitle>
              <div className="text-2xl font-bold text-muted-foreground">R$ 0</div>
              <p className="text-xs text-muted-foreground">Limitado</p>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">1 livro por dia</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Espera de 30s</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Com anúncios</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-sm text-muted-foreground">❌ Sem Luna IA</span>
                </div>
                <div className="flex items-center gap-2 opacity-50">
                  <span className="text-sm text-muted-foreground">❌ Sem downloads</span>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                disabled
              >
                Plano Atual
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Vantagens da Oferta Vitalícia */}
        <Card className="mb-6 bg-gradient-luxury border-primary/50 max-w-2xl mx-auto">
          <CardContent className="p-4 text-center">
            <div className="flex items-center justify-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <span className="text-primary">⚡</span>
                <span>Sem mensalidades</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-primary">💰</span>
                <span>Economia total</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-primary">🔒</span>
                <span>Acesso garantido</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {!user && (
          <Card className="bg-gradient-card border-primary/30">
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground mb-4">
                Faça login para escolher um plano e começar a ler
              </p>
              <Button 
                onClick={() => window.location.href = '/auth'}
                className="bg-gradient-primary"
              >
                Fazer Login
              </Button>
            </CardContent>
          </Card>
        )}

        <PixPaymentModal 
          isOpen={showPixModal}
          onClose={() => {
            setShowPixModal(false);
            checkSubscription();
          }}
        />
      </div>
    </div>
  );
}