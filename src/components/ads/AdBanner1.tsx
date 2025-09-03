import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const AdBanner1 = () => {
  const { subscription } = useAuth();

  useEffect(() => {
    // Only load ads for non-premium users
    if (subscription.subscribed) return;

    // Load the ad script
    const script = document.createElement('script');
    script.src = '//pl27533664.revenuecpmgate.com/08c2fb3206ccb1f2b2d849965a7d3a71/invoke.js';
    script.async = true;
    script.setAttribute('data-cfasync', 'false');
    document.head.appendChild(script);

    return () => {
      // Cleanup
      const existingScript = document.querySelector(`script[src="${script.src}"]`);
      if (existingScript) {
        document.head.removeChild(existingScript);
      }
    };
  }, []);

  // Don't render ads for premium users
  if (subscription.subscribed) return null;

  return (
    <div className="w-full flex justify-center py-4">
      <div id="container-08c2fb3206ccb1f2b2d849965a7d3a71"></div>
    </div>
  );
};