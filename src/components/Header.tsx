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
  const {
    user,
    subscription
  } = useAuth();
  return <header className="w-full border-b border-border/50 bg-surface-glass/95 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-glass/95 shadow-card">
      
    </header>;
};