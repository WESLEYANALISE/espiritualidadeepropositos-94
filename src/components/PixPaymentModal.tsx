import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, QrCode, CheckCircle, Copy, AlertTriangle, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PayerData {
  firstName: string;
  lastName: string;
  email: string;
  identificationType: string;
  identificationNumber: string;
}

interface PixData {
  payment_id: string;
  qr_code: string;
  qr_code_base64: string;
  expires_at: string;
  amount: number;
  status: string;
}

export default function PixPaymentModal({ isOpen, onClose }: PixPaymentModalProps) {
  const { user, checkSubscription } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [autoPolling, setAutoPolling] = useState<NodeJS.Timeout | null>(null);
  const [payerData, setPayerData] = useState<PayerData>({
    firstName: '',
    lastName: '',
    email: user?.email || '',
    identificationType: 'CPF',
    identificationNumber: ''
  });

  const handleInputChange = (field: keyof PayerData, value: string) => {
    setPayerData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const formatCPF = (cpf: string) => {
    const numbers = cpf.replace(/\D/g, '');
    return numbers.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  };

  const validateForm = () => {
    const { firstName, email, identificationNumber } = payerData;
    
    if (!firstName.trim()) {
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

    if (!identificationNumber.replace(/\D/g, '').trim() || identificationNumber.replace(/\D/g, '').length !== 11) {
      toast({
        title: 'CPF inválido',
        description: 'Digite um CPF válido com 11 dígitos',
        variant: 'destructive'
      });
      return false;
    }

    return true;
  };

  const handleCreatePixPayment = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('pix-payment-create', {
        body: {
          payer: {
            email: payerData.email.trim(),
            first_name: payerData.firstName.trim(),
            last_name: payerData.lastName.trim() || payerData.firstName.trim(),
            identification: {
              type: payerData.identificationType,
              number: payerData.identificationNumber.replace(/\D/g, '')
            }
          },
          transactionAmount: 9.00,
          description: 'Licença Vitalícia - Acesso Total',
          externalReference: user?.id
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao criar pagamento PIX');
      }

      setPixData({
        payment_id: data.payment_id,
        qr_code: data.qr_code,
        qr_code_base64: data.qr_code_base64,
        expires_at: data.expires_at,
        amount: data.amount,
        status: data.status
      });
      
      // Iniciar verificação automática a cada 3 segundos
      const pollingInterval = setInterval(() => {
        handleCheckPayment();
      }, 3000);
      setAutoPolling(pollingInterval);
      
      toast({
        title: 'QR Code PIX gerado',
        description: 'Escaneie o QR Code para efetuar o pagamento',
      });
    } catch (error: any) {
      console.error('Erro ao gerar PIX:', error);
      toast({
        title: 'Erro ao gerar PIX',
        description: error.message || 'Tente novamente em alguns instantes',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPixCode = async () => {
    if (!pixData?.qr_code) return;

    try {
      // Try different methods for iframe compatibility
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(pixData.qr_code);
      } else {
        // Fallback for iframe or insecure contexts
        const textArea = document.createElement('textarea');
        textArea.value = pixData.qr_code;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      
      toast({
        title: '✅ Código PIX copiado!',
        description: 'Cole no seu app do banco para pagar',
        duration: 2000,
      });
    } catch (error) {
      // Silent fallback - try old method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = pixData.qr_code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        toast({
          title: '✅ Código PIX copiado!',
          description: 'Cole no seu app do banco para pagar',
          duration: 2000,
        });
      } catch {
        toast({
          title: 'Erro ao copiar',
          description: 'Não foi possível copiar o código PIX',
          variant: 'destructive',
          duration: 2000,
        });
      }
    }
  };

  const handleCheckPayment = async () => {
    if (!pixData?.payment_id) return;

    setCheckingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke('pix-payment-status', {
        body: {
          payment_id: pixData.payment_id,
          user_id: user?.id
        }
      });

      if (error) {
        throw error;
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Erro ao verificar pagamento');
      }

      if (data.isPaid && data.plan === 'lifetime') {
        setPaymentConfirmed(true);
        
        // Parar verificação automática
        if (autoPolling) {
          clearInterval(autoPolling);
          setAutoPolling(null);
        }
        
        // Atualizar status da assinatura
        await checkSubscription();
        
        toast({
          title: '🎉 Pagamento confirmado!',
          description: 'Sua licença vitalícia foi ativada com sucesso!',
        });
      } else if (!autoPolling) {
        // Só mostrar erro se não estiver em polling automático
        toast({
          title: 'Pagamento pendente',
          description: `Status: ${data.status}. Aguarde o processamento.`,
          variant: 'destructive'
        });
      }
    } catch (error: any) {
      console.error('Erro ao verificar pagamento:', error);
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

  const handleClose = () => {
    // Parar verificação automática
    if (autoPolling) {
      clearInterval(autoPolling);
      setAutoPolling(null);
    }
    
    if (paymentConfirmed) {
      // Redirecionar para home após pagamento confirmado
      window.location.href = '/';
    } else {
      // Resetar formulário
      setPayerData({
        firstName: '',
        lastName: '',
        email: user?.email || '',
        identificationType: 'CPF',
        identificationNumber: ''
      });
      setPixData(null);
      setPaymentConfirmed(false);
      setCheckingPayment(false);
      onClose();
    }
  };

  // Limpeza ao desmontar componente
  useEffect(() => {
    return () => {
      if (autoPolling) {
        clearInterval(autoPolling);
      }
    };
  }, [autoPolling]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-xl flex items-center justify-center">
            <CreditCard className="h-5 w-5 mr-2" />
            Pagamento PIX
          </DialogTitle>
        </DialogHeader>

        {!pixData ? (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <p className="text-3xl font-bold text-primary">R$ 9,00</p>
              <p className="text-sm text-muted-foreground">Pagamento único • Acesso vitalício</p>
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="firstName">Nome *</Label>
                <Input
                  id="firstName"
                  value={payerData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  placeholder="Seu primeiro nome"
                />
              </div>

              <div>
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  value={payerData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  placeholder="Seu sobrenome (opcional)"
                />
              </div>

              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={payerData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="seu@email.com"
                />
              </div>

              <div>
                <Label htmlFor="cpf">CPF *</Label>
                <Input
                  id="cpf"
                  value={formatCPF(payerData.identificationNumber)}
                  onChange={(e) => handleInputChange('identificationNumber', e.target.value)}
                  placeholder="000.000.000-00"
                  maxLength={14}
                />
              </div>
            </div>

            <Button 
              onClick={handleCreatePixPayment}
              disabled={loading}
              className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Gerando PIX...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Gerar PIX
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
                  <p className="text-green-800 font-semibold">✅ Acesso liberado!</p>
                  <p className="text-green-700">Agora você tem acesso a:</p>
                  <ul className="text-green-600 text-xs space-y-1 list-disc list-inside">
                    <li>Todos os livros e materiais</li>
                    <li>Assistente de IA</li>
                    <li>Funcionalidades premium</li>
                    <li>Acesso vitalício garantido</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            <Button onClick={handleClose} className="w-full bg-green-600 hover:bg-green-700">
              Começar a usar!
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
                    src={`data:image/png;base64,${pixData.qr_code_base64}`}
                    alt="QR Code PIX"
                    className="w-48 h-48 border rounded"
                  />
                </div>
                <div className="space-y-2 text-sm">
                  <p><strong>Valor:</strong> R$ {pixData.amount.toFixed(2)}</p>
                  <p><strong>Status:</strong> {pixData.status}</p>
                  {pixData.expires_at && (
                    <p className="text-muted-foreground">
                      <strong>Expira em:</strong> {new Date(pixData.expires_at).toLocaleString('pt-BR')}
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

            <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 p-2 rounded">
              <AlertTriangle className="h-4 w-4" />
              Verificação automática ativa - sua licença será ativada automaticamente
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
                    Verificando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Já paguei
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