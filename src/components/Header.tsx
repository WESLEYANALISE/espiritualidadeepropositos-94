import { BookOpen } from "lucide-react";
import { GlobalSearch } from "./GlobalSearch";
import { MobileMenu } from "./MobileMenu";
import { BookItem } from "@/pages/Index";

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
  return (
    <header className="w-full border-b border-border/50 bg-surface-glass/95 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-glass/95 shadow-card">
      <div className="container mx-auto max-w-4xl px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Mobile Menu */}
          <MobileMenu />
          
          {/* Logo/Title - Hidden on mobile when menu is present */}
          <div className="hidden md:flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold text-foreground">Biblioteca Digital</h1>
          </div>
          
          {/* Search removed from header */}
          
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