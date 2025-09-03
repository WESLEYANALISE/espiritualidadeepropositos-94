import { BookOpen, Crown } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { MobileMenu } from "./MobileMenu";
import { BookItem } from "@/pages/Index";
import { useAuth } from "@/contexts/AuthContext";

interface HeaderProps {
  totalBooks?: number;
  availableBooks?: number;
  onBookSelect?: (book: BookItem, area: string) => void;
}

export const Header = ({
  totalBooks = 0,
  availableBooks = 0,
  onBookSelect
}: HeaderProps) => {
  const { user, subscription } = useAuth();
  
  return (
    <header className="w-full border-b border-border/50 bg-surface-glass/95 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-glass/95 shadow-card">
      <div className="container mx-auto max-w-4xl px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left side: Mobile Menu + User Info */}
          <div className="flex items-center gap-3">
            <MobileMenu />
            
            {/* User Info - Only show when user is logged in */}
            {user && (
              <div className="flex items-center gap-2 md:hidden">
                <div className="w-8 h-8 bg-gradient-primary rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-primary-foreground">
                    {user.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground leading-tight">
                    {user.email?.split('@')[0]}
                  </span>
                  {subscription.subscribed && subscription.subscription_tier === 'vitalício' && (
                    <div className="flex items-center gap-1">
                      <Crown className="h-3 w-3 text-primary" />
                      <span className="text-xs text-primary font-medium">Vitalício</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Logo/Title - Hidden on mobile when menu is present */}
          <div className="hidden md:flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Biblioteca Digital</h1>
          </div>
          
          {/* Stats */}
          <div className="hidden sm:flex items-center gap-4 text-sm text-muted-foreground">
            <span>{totalBooks} livros</span>
            <span className="w-px h-4 bg-border"></span>
            <span>{availableBooks} disponíveis</span>
          </div>
        </div>
      </div>
    </header>
  );
};