import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, CreditCard, User, Crown, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Configuracoes = () => {
  const { user, subscription, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSupport = () => {
    toast.success('Entre em contato: contato@seudominio.com');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('Logout realizado com sucesso');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast.error('Erro ao fazer logout');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-2xl px-4 py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate('/')}
            className="shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Configurações</h1>
            <p className="text-muted-foreground">Gerencie sua conta e assinatura</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* Informações do usuário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Informações da Conta
              </CardTitle>
              <CardDescription>
                Suas informações pessoais e status da conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">E-mail</label>
                <p className="text-foreground">{user?.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Status da assinatura</label>
                <div className="flex items-center gap-2">
                  {subscription.subscribed ? (
                    <>
                      <Crown className="h-4 w-4 text-primary" />
                      <span className="text-primary font-medium">
                        Premium - {subscription.subscription_tier}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted-foreground">Gratuito</span>
                  )}
                </div>
              </div>
              {subscription.subscribed && subscription.subscription_end && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Renovação</label>
                  <p className="text-foreground">
                    {new Date(subscription.subscription_end).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Gerenciamento de assinatura */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Assinatura
              </CardTitle>
              <CardDescription>
                Gerencie sua assinatura e métodos de pagamento
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {subscription.subscribed ? (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Você pode gerenciar sua assinatura, alterar método de pagamento ou cancelar através do portal do cliente.
                  </p>
                  <Button 
                    onClick={handleSupport}
                    className="w-full"
                    variant="outline"
                  >
                    <CreditCard className="h-4 w-4 mr-2" />
                    Suporte
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Você não possui uma assinatura ativa. Assine um plano para ter acesso completo.
                  </p>
                  <Button 
                    onClick={() => navigate('/assinaturas')}
                    className="w-full bg-gradient-primary"
                  >
                    <Crown className="h-4 w-4 mr-2" />
                    Ver Planos
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Logout */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogOut className="h-5 w-5" />
                Sair da Conta
              </CardTitle>
              <CardDescription>
                Desconectar-se da sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={handleSignOut}
                variant="destructive"
                className="w-full"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Fazer Logout
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes;