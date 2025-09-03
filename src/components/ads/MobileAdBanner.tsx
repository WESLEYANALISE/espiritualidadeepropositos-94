import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';

interface MobileAdBannerProps {
  placement?: 'inline' | 'sticky' | 'footer';
}

export const MobileAdBanner = ({ placement = 'inline' }: MobileAdBannerProps) => {
  const { subscription } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    // Only load ads for non-premium users on mobile
    if (subscription.subscribed || !isMobile) return;

    // Create unique container ID for each placement
    const containerId = `mobile-ad-${placement}-${Date.now()}`;
    
    // Set up the ad options optimized for mobile
    (window as any).atOptions = {
      'key': 'f1e003d021db5553552b6738831a850d',
      'format': 'iframe',
      'height': 50,
      'width': 300,
      'params': {},
      'container': containerId
    };

    // Load the ad script
    const script = document.createElement('script');
    script.src = '//www.highperformanceformat.com/f1e003d021db5553552b6738831a850d/invoke.js';
    script.type = 'text/javascript';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      // Cleanup
      const existingScript = document.querySelector(`script[src="${script.src}"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, [placement, subscription.subscribed, isMobile]);

  // Don't render ads for premium users or desktop
  if (subscription.subscribed || !isMobile) return null;

  const getContainerClass = () => {
    switch (placement) {
      case 'sticky':
        return 'sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-border/30';
      case 'footer':
        return 'border-t border-border/30 bg-background/95';
      default:
        return 'my-4';
    }
  };

  return (
    <div className={`w-full flex justify-center py-2 ${getContainerClass()}`}>
      <div className="w-[300px] h-[50px] bg-muted/10 rounded-lg border border-border/20 flex items-center justify-center overflow-hidden">
        <div 
          id={`mobile-ad-${placement}-${Date.now()}`}
          className="w-full h-full flex items-center justify-center"
        >
          <span className="text-xs text-muted-foreground">Carregando...</span>
        </div>
      </div>
    </div>
  );
};