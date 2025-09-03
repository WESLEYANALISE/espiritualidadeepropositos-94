import { BookItem } from "@/pages/Index";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Download, Heart } from "lucide-react";
import { useState } from "react";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
interface BookCardProps {
  book: BookItem;
  onClick: () => void;
  onFavorite?: (bookId: number, isFavorite: boolean) => void;
  isFavorite?: boolean;
}
export const BookCard = ({
  book,
  onClick,
  onFavorite,
  isFavorite = false
}: BookCardProps) => {
  const [localFavorite, setLocalFavorite] = useState(isFavorite);
  const { checkDownloadAccess, limits } = useSubscriptionLimits();
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newFavoriteState = !localFavorite;
    setLocalFavorite(newFavoriteState);
    onFavorite?.(book.id, newFavoriteState);
  };
  return <Card className={`cursor-pointer card-hover border group relative overflow-hidden animate-fade-in-up ${book.isRead ? 'bg-gradient-card border-accent shadow-card' : 'bg-gradient-card border-border shadow-card hover:shadow-luxury'} w-full`} onClick={onClick}>
      {/* Subtle hover overlay */}
      <div className="absolute inset-0 bg-gradient-luxury opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      <CardContent className="p-0">
        <div className="flex gap-4 p-4 sm:gap-5 sm:p-5 relative z-10">
          <div className="relative flex-shrink-0">
            <div className="w-24 h-32 sm:w-28 sm:h-36 bg-gradient-primary rounded-xl flex items-center justify-center overflow-hidden shadow-elevated group-hover:shadow-luxury transition-shadow duration-300">
              {book.imagem ? <img src={book.imagem} alt={book.livro} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" /> : <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-primary-foreground" />}
            </div>
            
            
            {/* Elegant Indicators */}
            <div className="absolute -top-2 -right-2 flex flex-col gap-1.5">
              {book.link && <div className="w-6 h-6 sm:w-7 sm:h-7 bg-primary rounded-full flex items-center justify-center shadow-glow backdrop-blur-sm border border-primary/20">
                  <BookOpen className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-primary-foreground" />
                </div>}
              {book.download && <div 
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center shadow-lg backdrop-blur-sm border cursor-pointer transition-all duration-300 ${
                    limits.canDownload 
                      ? 'bg-emerald-500 border-emerald-400/20 hover:scale-110' 
                      : 'bg-muted border-muted-foreground/20'
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (limits.canDownload && book.download) {
                      window.open(book.download, '_blank');
                    } else {
                      checkDownloadAccess();
                    }
                  }}
                  title={limits.canDownload ? "Download PDF" : "Acesso Premium Necessário"}
                >
                  <Download className={`h-3 w-3 sm:h-3.5 sm:w-3.5 ${limits.canDownload ? 'text-white' : 'text-muted-foreground'}`} />
                </div>}
            </div>
            
            {/* Add favorite button to book cover */}
            <button onClick={handleFavoriteClick} className="absolute -bottom-2 -left-2 w-7 h-7 bg-surface-luxury/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-elevated hover:shadow-luxury transition-all duration-300 hover:scale-110 border border-border/50">
              <Heart className={`h-3.5 w-3.5 transition-colors duration-200 ${localFavorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground hover:text-red-400'}`} />
            </button>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="font-bold text-foreground text-base sm:text-lg leading-tight group-hover:text-primary transition-colors duration-300">
              {book.livro}
            </h3>
              {book.isRead && <Badge variant="secondary" className="text-xs shrink-0 bg-accent/80 border-accent">
                  Lida
                </Badge>}
            </div>
            
            <p className="text-sm text-primary font-semibold mb-3 group-hover:text-primary-glow transition-colors duration-300">
              {book.autor}
            </p>
            
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4 leading-relaxed">
              {book.sobre}
            </p>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="text-xs bg-gradient-luxury border-primary/20 text-primary hover:bg-primary/10 transition-colors duration-200">
                Clássico
              </Badge>
              {book.download && <Badge 
                className={`text-xs transition-colors duration-200 cursor-pointer ${
                  limits.canDownload 
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30' 
                    : 'bg-muted/50 text-muted-foreground border-muted/30'
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (limits.canDownload && book.download) {
                    window.open(book.download, '_blank');
                  } else {
                    checkDownloadAccess();
                  }
                }}
              >
                {limits.canDownload ? 'Download' : 'Premium'}
              </Badge>}
              
            </div>
          </div>
        </div>
      </CardContent>
    </Card>;
};