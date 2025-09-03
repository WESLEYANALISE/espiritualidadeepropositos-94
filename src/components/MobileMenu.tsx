import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu, Home, BookOpen, Heart, StickyNote, User, Crown, Settings, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

export const MobileMenu = () => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const menuItems = [
    { icon: Home, label: 'Início', path: '/' },
    { icon: BookOpen, label: 'Lendo', path: '/lendo' },
    { icon: StickyNote, label: 'Plano de Leitura', path: '/plano-leitura' },
    { icon: Heart, label: 'Favoritos', path: '/favoritos' },
    { icon: Crown, label: 'Assinaturas', path: '/assinaturas' },
    { icon: Settings, label: 'Configurações', path: '/configuracoes' },
  ];

  const handleNavigation = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    setOpen(false);
    navigate('/auth');
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="md:hidden text-foreground hover:bg-surface-elevated"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="bg-surface-elevated border-border/50 w-80">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="border-b border-border/50 pb-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                <User className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">
                  {user ? `Olá, ${user.email?.split('@')[0]}` : 'Visitante'}
                </h3>
                <p className="text-sm text-muted-foreground">Biblioteca Digital</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Button
                  key={item.path}
                  variant="ghost"
                  onClick={() => handleNavigation(item.path)}
                  className="w-full justify-start gap-3 h-12 text-foreground hover:bg-surface-glass hover:text-primary"
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Button>
              );
            })}
          </nav>

          {/* Footer */}
          {user && (
            <div className="border-t border-border/50 pt-4">
              <Button
                variant="ghost"
                onClick={handleSignOut}
                className="w-full justify-start gap-3 h-12 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                <LogOut className="h-5 w-5" />
                Sair
              </Button>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};