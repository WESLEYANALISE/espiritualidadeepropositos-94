import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, RefreshCw, AlertTriangle, Crown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function RestoreAccess() {
  const navigate = useNavigate();
  const { user, subscription, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [restoring, setRestoring] = useState(false);
  const [restored, setRestored] = useState(false);

  const handleRestoreAccess = async () => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para restaurar o acesso',
        variant: 'destructive'
      });
      return;
    }

    setRestoring(true);
    try {
      const { data, error } = await supabase.functions.invoke('restore-user-access', {
        body: {
          user_id: user.id
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao restaurar acesso');
      }

      setRestored(true);
      
      // Atualizar status da assinatura
      await checkSubscription();
      
      toast({
        title: '🎉 Acesso restaurado!',
        description: 'Sua licença vitalícia foi restaurada com sucesso.',
      });

    } catch (error: any) {
      console.error('Erro ao restaurar acesso:', error);
      toast({
        title: 'Erro ao restaurar acesso',
        description: error.message || 'Não foi possível restaurar seu acesso. Verifique se você tem pagamentos aprovados.',
        variant: 'destructive'
      });
    } finally {
      setRestoring(false);
    }
  };

  const isLifetimeActive = subscription.subscribed && subscription.subscription_tier === 'vitalício';

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-gradient-card border-primary/30 shadow-luxury">
        <CardHeader className="text-center space-y-4">
          {isLifetimeActive || restored ? (
            <>
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="h-8 w-8 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">
                  Acesso Restaurado!
                </CardTitle>
                <CardDescription>
                  Sua assinatura vitalícia está ativa. Aproveite todos os recursos premium!
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
                  Restaurar Acesso
                </CardTitle>
                <CardDescription>
                  Já pagou e não consegue acessar? Restaure seu acesso aqui
                </CardDescription>
              </div>
            </>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          {!user && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">
                Você precisa estar logado para restaurar o acesso
              </p>
            </div>
          )}

          {isLifetimeActive && (
            <div className="text-center space-y-3">
              <div className="flex items-center justify-center gap-2 text-primary">
                <Crown className="h-5 w-5" />
                <span className="font-medium">Acesso Premium Ativo</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Sua assinatura vitalícia está funcionando perfeitamente
              </p>
            </div>
          )}

          {!isLifetimeActive && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800 font-semibold">Como funciona:</p>
                <ul className="text-xs text-blue-700 mt-1 space-y-1">
                  <li>• Verificamos se você tem pagamentos aprovados</li>
                  <li>• Restauramos automaticamente sua licença vitalícia</li>
                  <li>• Seu acesso é ativado imediatamente</li>
                </ul>
              </div>

              <Button 
                onClick={handleRestoreAccess}
                disabled={restoring || !user}
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
              >
                {restoring ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Restaurando acesso...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Restaurar Meu Acesso
                  </>
                )}
              </Button>
            </div>
          )}

          <div className="space-y-2">
            <Button 
              onClick={() => navigate('/')}
              className={isLifetimeActive ? "w-full bg-gradient-primary hover:shadow-glow transition-all duration-300" : "w-full"}
              variant={isLifetimeActive ? "default" : "secondary"}
            >
              {isLifetimeActive ? "Usar o app" : "Voltar ao início"}
            </Button>

            {!user && (
              <Button 
                variant="outline"
                onClick={() => navigate('/auth')}
                className="w-full"
              >
                Fazer Login
              </Button>
            )}
          </div>

          <div className="text-center text-xs text-muted-foreground">
            <p>
              {isLifetimeActive 
                ? "Obrigado por ser um usuário premium! Se tiver dúvidas, entre em contato conosco."
                : "Problemas para restaurar? Entre em contato conosco pelo suporte."
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}