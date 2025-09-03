import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SubscriptionLimits {
  maxFavorites: number;
  maxReadingPlans: number;
  hasLifetimeAccess: boolean;
  canDownload: boolean;
}

export const useSubscriptionLimits = () => {
  const { user, subscription } = useAuth();
  const { toast } = useToast();
  const [limits, setLimits] = useState<SubscriptionLimits>({
    maxFavorites: 2,
    maxReadingPlans: 1,
    hasLifetimeAccess: false,
    canDownload: false
  });

  useEffect(() => {
    if (subscription?.subscribed) {
      setLimits({
        maxFavorites: Infinity,
        maxReadingPlans: Infinity,
        hasLifetimeAccess: true,
        canDownload: true
      });
    } else {
      setLimits({
        maxFavorites: 2,
        maxReadingPlans: 1,
        hasLifetimeAccess: false,
        canDownload: false
      });
    }
  }, [subscription]);

  const checkFavoriteLimit = () => {
    if (!user) return false;
    
    const favorites = JSON.parse(localStorage.getItem('favoriteBooks') || '[]');
    const currentCount = favorites.length;
    
    if (currentCount >= limits.maxFavorites) {
      toast({
        title: '⭐ Limite atingido',
        description: `Usuários gratuitos podem favoritar apenas ${limits.maxFavorites} livros. Adquira a licença vitalícia para acesso ilimitado!`,
        variant: 'destructive',
        duration: 4000,
      });
      return false;
    }
    
    return true;
  };

  const checkReadingPlanLimit = () => {
    if (!user) return false;
    
    const plans = JSON.parse(localStorage.getItem(`reading_plans_${user.id}`) || '[]');
    const currentCount = plans.length;
    
    if (currentCount >= limits.maxReadingPlans) {
      toast({
        title: '📚 Limite atingido',
        description: `Usuários gratuitos podem criar apenas ${limits.maxReadingPlans} plano de leitura. Adquira a licença vitalícia para criar quantos quiser!`,
        variant: 'destructive',
        duration: 4000,
      });
      return false;
    }
    
    return true;
  };

  const checkDownloadAccess = () => {
    if (!limits.canDownload) {
      toast({
        title: '🔒 Acesso Premium',
        description: 'Download de PDFs disponível apenas para usuários com licença vitalícia!',
        variant: 'destructive',
        duration: 4000,
      });
      return false;
    }
    return true;
  };

  return {
    limits,
    checkFavoriteLimit,
    checkReadingPlanLimit,
    checkDownloadAccess
  };
};