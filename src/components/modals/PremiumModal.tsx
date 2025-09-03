import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Crown, X } from "lucide-react";

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PremiumModal = ({ isOpen, onClose }: PremiumModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full bg-gradient-card border-primary/30 shadow-luxury">
        <CardContent className="p-6">
          <div className="text-center space-y-6">
            <div className="relative">
              <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
                <Crown className="h-8 w-8 text-primary-foreground" />
              </div>
              <button
                onClick={onClose}
                className="absolute -top-2 -right-2 w-8 h-8 bg-surface-luxury/90 backdrop-blur-sm rounded-full flex items-center justify-center border border-border hover:bg-surface-luxury transition-all duration-200"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            
            <div>
              <h3 className="text-xl font-bold text-foreground mb-2">
                Desbloqueie Todo o Potencial
              </h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Escolha um plano e tenha acesso imediato e downloads
              </p>
            </div>
            
            <div className="space-y-3 text-left">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-foreground">Leitura imediata sem espera</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-foreground">Livros ilimitados por dia</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full"></div>
                <span className="text-sm text-foreground">Downloads em PDF (Premium)</span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Button 
                onClick={() => window.location.href = '/assinaturas'}
                className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
              >
                <Crown className="h-4 w-4 mr-2" />
                Ver Planos
              </Button>
              <Button 
                variant="outline"
                onClick={onClose}
                className="w-full"
              >
                Continuar Grátis
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};