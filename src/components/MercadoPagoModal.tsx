import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, QrCode, CheckCircle, Copy, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface MercadoPagoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FormData {
  nome: string;
  telefone: string;
  email: string;
  cpf: string;
}

interface QRCodeData {
  qr_code_url: string;
  qr_code_base64: string;
  payment_id: string;
  expires_at: string;
}

export default function MercadoPagoModal({ isOpen, onClose }: MercadoPagoModalProps) {
  const { user, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [qrCodeData, setQrCodeData] = useState<QRCodeData | null>(null);
  const [autoPolling, setAutoPolling] = useState<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState<FormData>({
    nome: '',
    telefone: '',
    email: user?.email || '',
    cpf: ''
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const formatPhone = (phone: string) => {
    const numbers = phone.replace(/\D/g, '');
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  };

  const validateForm = () => {
    const { nome, telefone, email, cpf } = formData;
    
    if (!nome.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Nome é obrigatório',
        variant: 'destructive'
      });
      return false;
    }

    if (!email.trim() || !email.includes('@')) {
      toast({
        title: 'Email inválido',
        description: 'Digite um email válido',
        variant: 'destructive'
      });
      return false;
    }

    if (!telefone.replace(/\D/g, '').trim() || telefone.replace(/\D/g, '').length < 10) {
      toast({
        title: 'Telefone inválido',
        description: 'Digite um telefone válido',
        variant: 'destructive'
      });
      return false;
    }

    if (!cpf.replace(/\D/g, '').trim() || cpf.replace(/\D/g, '').length !== 11) {
      toast({
        title: 'CPF inválido',
        description: 'Digite um CPF válido com 11 dígitos',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleCreateQRCode = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mercado-pago-create', {
        body: {
          nome: formData.nome.trim(),
          email: formData.email.trim(),
          cpf: formData.cpf.replace(/\D/g, ''),
          amount: 9.00,
          description: 'Licença Vitalícia - Acesso Total'
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.qr_code && data?.qr_code_base64) {
        setQrCodeData({
          qr_code_url: data.qr_code,
          qr_code_base64: data.qr_code_base64,
          payment_id: data.payment_id,
          expires_at: data.expires_at
        });
        
        // Start auto-polling for payment verification every 5 seconds
        const pollingInterval = setInterval(() => {
          handleCheckPayment();
        }, 5000);
        setAutoPolling(pollingInterval);
        
        toast({
          title: 'QR Code PIX gerado',
          description: 'Escaneie o QR Code para efetuar o pagamento',
        });
      } else {
        throw new Error('Dados do QR Code não foram retornados');
      }
    } catch (error: any) {
      console.error('Erro ao gerar QR Code:', error);
      toast({
        title: 'Erro ao gerar QR Code',
        description: error.message || 'Tente novamente em alguns instantes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (!qrCodeData?.qr_code_url) return;

    try {
      await navigator.clipboard.writeText(qrCodeData.qr_code_url);
      toast({
        title: '✅ Código PIX copiado!',
        description: 'Código PIX copiado para a área de transferência',
      });
    } catch (error) {
      toast({
        title: 'Erro ao copiar',
        description: 'Não foi possível copiar o código PIX',
        variant: 'destructive'
      });
    }
  };

  const handleCheckPayment = async () => {
    if (!qrCodeData?.payment_id) return;

    setCheckingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('payment-verify', {
        body: {
          payment_id: qrCodeData.payment_id,
          user_id: user?.id
        }
      });

      if (error) {
        throw error;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.isPaid && data?.plan === 'lifetime') {
        setPaymentConfirmed(true);
        
        // Clear auto-polling
        if (autoPolling) {
          clearInterval(autoPolling);
          setAutoPolling(null);
        }
        
        // Automatically update subscription status
        await checkSubscription();
        
        toast({
          title: '🎉 Pagamento confirmado!',
          description: 'Parabéns! Sua licença vitalícia foi ativada com sucesso.',
        });
      } else {
        // Only show error message if not polling automatically
        if (!autoPolling) {
          toast({
            title: 'Pagamento não confirmado',
            description: `Status: ${data?.status || 'pendente'}. O pagamento ainda não foi processado.`,
            variant: 'destructive'
          });
        }
      }
    } catch (error: any) {
      console.error('Erro ao verificar pagamento:', error);
      // Only show error if not polling automatically
      if (!autoPolling) {
        toast({
          title: 'Erro ao verificar pagamento',
          description: error.message || 'Tente novamente em alguns instantes',
          variant: 'destructive'
        });
      }
    } finally {
      setCheckingPayment(false);
    }
  };

  const activateLifetimeAccess = async () => {
    if (!user) return;

    try {
      // Update subscription status in context
      await checkSubscription();
      
      toast({
        title: '🎉 Bem-vindo!',
        description: 'Redirecionando para o app...',
      });

    } catch (error: any) {
      console.error('Error checking subscription:', error);
      // Continue anyway, the user should have access
    }
  };

  const handleClose = async () => {
    // Clear auto-polling
    if (autoPolling) {
      clearInterval(autoPolling);
      setAutoPolling(null);
    }
    
    if (paymentConfirmed) {
      // Activate lifetime access when user clicks "Usar o app!"
      await activateLifetimeAccess();
      
      // Redirect to home after payment confirmation
      window.location.href = '/';
    } else {
      setFormData({
        nome: '',
        telefone: '',
        email: user?.email || '',
        cpf: ''
      });
      setQrCodeData(null);
      setPaymentConfirmed(false);
      setCheckingPayment(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Pagamento PIX - Mercado Pago
          </DialogTitle>
        </DialogHeader>

        {!qrCodeData ? (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-primary">R$ 9,00</p>
              <p className="text-sm text-muted-foreground">Pagamento único • Acesso para sempre</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="nome">Nome Completo *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleInputChange('nome', e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div>
                <Label htmlFor="telefone">Telefone *</Label>
                <Input
                  id="telefone"
                  value={formatPhone(formData.telefone)}
                  onChange={(e) => handleInputChange('telefone', e.target.value)}
                  placeholder="(11) 99999-9999"
                  maxLength={15}
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={formatCPF(formData.cpf)}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>

            <Button 
              onClick={handleCreateQRCode}
              disabled={loading}
              className="w-full bg-gradient-primary"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando QR Code...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Gerar QR Code
                </>
              )}
            </Button>
          </div>
        ) : paymentConfirmed ? (
          <div className="text-center space-y-4">
            <div className="mb-4">
              <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-green-600 mb-2">🎉 Parabéns!</h3>
              <p className="text-lg font-semibold mb-2">Pagamento confirmado!</p>
              <p className="text-sm text-muted-foreground">
                Sua licença vitalícia foi ativada com sucesso.
              </p>
            </div>

            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="space-y-2 text-sm">
                  <p className="text-green-800 font-semibold">✅ Tudo desbloqueado!</p>
                  <p className="text-green-700">Agora você tem acesso completo a:</p>
                  <ul className="text-green-600 text-xs space-y-1 list-disc list-inside">
                    <li>Todos os livros e materiais</li>
                    <li>Assistente de IA</li>
                    <li>Funcionalidades premium</li>
                    <li>Acesso vitalício</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700">
              Usar o app!
            </Button>
          </div>
        ) : (
          <div className="text-center space-y-4">
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">Pague com PIX</h3>
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code ou copie o código PIX
              </p>
            </div>

            <Card>
              <CardContent className="p-4">
                <div className="flex justify-center mb-4">
                  <img 
                    src={`data:image/png;base64,${qrCodeData.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48"
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Valor:</strong> R$ 9,00</p>
                  <p><strong>Descrição:</strong> Licença Vitalícia - Acesso Total</p>
                  {qrCodeData.expires_at && (
                    <p className="text-muted-foreground">
                      <strong>Expira em:</strong> {new Date(qrCodeData.expires_at).toLocaleString('pt-BR')}
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleCopyPixCode}
              variant="outline"
              className="w-full"
            >
              <Copy className="h-4 w-4 mr-2" />
              Copiar código PIX
            </Button>

            <div className="text-xs text-muted-foreground">
              Após o pagamento, sua licença será ativada automaticamente
            </div>

            <div className="space-y-2">
              <Button 
                onClick={handleCheckPayment}
                disabled={checkingPayment}
                className="w-full bg-gradient-primary"
              >
                {checkingPayment ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verificando pagamento...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Já efetuei o pagamento
                  </>
                )}
              </Button>

              <Button variant="outline" onClick={handleClose} className="w-full">
                Fechar
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}