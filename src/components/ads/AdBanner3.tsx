import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const AdBanner3 = () => {
  const { subscription } = useAuth();

  useEffect(() => {
    // Only show revenue gate for non-premium users
    if (subscription.subscribed) return;

    // Create invisible link for revenue gate
    const handleClick = () => {
      window.open('https://www.revenuecpmgate.com/y7yw784i?key=0c4f31a88c44cda8a1285d3232733ee9', '_blank');
    };

    // Add click listener to document for revenue gate
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, []);

  // Don't render revenue gate for premium users
  if (subscription.subscribed) return null;

  return (
    <div className="w-full flex justify-center py-4">
      <div className="min-h-[50px] w-full"></div>
    </div>
  );
};