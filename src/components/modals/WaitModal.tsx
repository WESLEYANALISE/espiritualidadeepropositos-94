import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Timer, Crown } from "lucide-react";

interface WaitModalProps {
  isOpen: boolean;
  countdown: number;
}

export const WaitModal = ({ isOpen, countdown }: WaitModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-gradient-card border-primary/30 shadow-luxury">
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto">
              <Timer className="h-8 w-8 text-primary-foreground" />
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Aguarde um momento...
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Sua leitura gratuita será liberada em:
              </p>
            </div>
            
            <div className="text-4xl font-bold text-primary">
              {countdown}s
            </div>
            
            <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-xl p-4 text-white shadow-luxury border border-purple-400/30">
              <div className="space-y-3">
                <div className="flex justify-center">
                  <Crown className="h-6 w-6 text-yellow-300" />
                </div>
                
                <div>
                  <h4 className="font-bold text-sm mb-1">
                    🚀 Licença Premium - Apenas R$ 9,00
                  </h4>
                  <p className="text-xs text-white/90 mb-2">
                    Pagamento único • Sem mensalidades
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-1 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-yellow-300 rounded-full"></div>
                    <span>Sem anúncios</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-blue-300 rounded-full"></div>
                    <span>Acesso à Luna</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-green-300 rounded-full"></div>
                    <span>Download PDF</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-1.5 h-1.5 bg-purple-300 rounded-full"></div>
                    <span>Leitura imediata</span>
                  </div>
                </div>
                
                <Button 
                  onClick={() => window.location.href = '/assinaturas'}
                  className="w-full bg-white text-purple-600 hover:bg-gray-100 font-bold text-xs py-2"
                >
                  🎯 Ativar Agora - R$ 9,00
                </Button>
              </div>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Ou aguarde {countdown}s para continuar gratuitamente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};