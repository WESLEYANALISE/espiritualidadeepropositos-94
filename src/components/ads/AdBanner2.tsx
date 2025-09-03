import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/contexts/AuthContext';

export const AdBanner2 = () => {
  const isMobile = useIsMobile();
  const { subscription } = useAuth();

  useEffect(() => {
    // Only load ads for non-premium users
    if (subscription.subscribed) return;

    // Set up the ad options with responsive sizing
    (window as any).atOptions = {
      'key': 'f1e003d021db5553552b6738831a850d',
      'format': 'iframe',
      'height': isMobile ? 50 : 60,
      'width': isMobile ? 300 : 320,
      'params': {}
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
  }, [isMobile, subscription.subscribed]);

  // Don't render ads for premium users
  if (subscription.subscribed) return null;

  return (
    <div className="w-full flex justify-center py-2 md:py-4">
      <div 
        className={`${
          isMobile ? 'w-[300px] h-[50px]' : 'w-80 h-[60px]'
        } bg-muted/20 rounded-lg border border-border/30 flex items-center justify-center`}
      >
        <div className="text-xs text-muted-foreground">Publicidade</div>
      </div>
    </div>
  );
};