import { BookOpen, Heart, Target, Home, Sparkles } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
export const BottomNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navItems = [{
    icon: Home,
    label: 'Início',
    path: '/'
  }, {
    icon: BookOpen,
    label: 'Lendo',
    path: '/lendo'
  }, {
    icon: Target,
    label: 'Cronograma',
    path: '/plano-leitura'
  }, {
    icon: Heart,
    label: 'Favoritos',
    path: '/favoritos'
  }];
  return <div className="fixed bottom-4 left-4 right-4 z-50 pointer-events-none">
      <div className="container mx-auto max-w-md relative pointer-events-auto">
        {/* Floating Navigation Card */}
        <div className="bg-surface-elevated/95 backdrop-blur-xl border border-border/50 rounded-2xl shadow-luxury p-3 animate-scale-in">
          <div className="grid grid-cols-4 gap-1">
            {navItems.map(item => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
              return <Button key={item.path} variant="ghost" onClick={() => navigate(item.path)} className={`flex flex-col items-center gap-1 h-auto py-2.5 px-2 rounded-xl transition-all duration-300 transform ${isActive ? 'text-primary bg-primary/15 shadow-glow scale-105 animate-bounce-in' : 'text-muted-foreground hover:text-foreground hover:bg-accent/30 hover:scale-110 hover:-translate-y-1'}`}>
                  <Icon className="h-6 w-6" />
                  <span className="text-[10px] font-medium leading-none">{item.label}</span>
                </Button>;
          })}
          </div>
        </div>
        
        {/* Central Luna FAB */}
        <Button 
          onClick={() => navigate('/luna')} 
          className="absolute left-1/2 -translate-x-1/2 -top-6 w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center p-0"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      </div>
    </div>;
};