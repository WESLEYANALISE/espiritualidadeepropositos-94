import { Crown, Zap, Download, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PromoBanner = () => {
  return (
    <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 rounded-xl p-4 text-white shadow-luxury border border-purple-400/30">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
            <Crown className="h-6 w-6 text-yellow-300" />
          </div>
        </div>
        
        <div>
          <h3 className="text-lg font-bold mb-1">
            🚀 Licença Premium - Apenas R$ 9,00
          </h3>
          <p className="text-sm text-white/90">
            Pagamento único • Sem mensalidades
          </p>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
            <Zap className="h-4 w-4 text-yellow-300" />
            <span>Sem anúncios</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
            <Bot className="h-4 w-4 text-blue-300" />
            <span>Acesso à Luna</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
            <Download className="h-4 w-4 text-green-300" />
            <span>Download PDF</span>
          </div>
          <div className="flex items-center gap-2 bg-white/10 rounded-lg p-2">
            <Crown className="h-4 w-4 text-purple-300" />
            <span>Leitura imediata</span>
          </div>
        </div>
        
        <Button 
          onClick={() => window.location.href = '/assinaturas'}
          className="w-full bg-white text-purple-600 hover:bg-gray-100 font-bold shadow-lg"
        >
          🎯 Ativar Agora - R$ 9,00
        </Button>
      </div>
    </div>
  );
};