import { useState } from "react";
import { BookItem } from "@/pages/Index";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, BookOpen, Download, X, Heart, Sparkles, BookMarked, Lock } from "lucide-react";
import { YouTubePlayer } from "./YouTubePlayer";
import { useAuth } from "@/contexts/AuthContext";
import { BookAssistant } from "@/components/BookAssistant";
import { WaitModal } from "@/components/modals/WaitModal";
import { PremiumModal } from "@/components/modals/PremiumModal";
import { useBookReading } from "@/hooks/useBookReading";

interface BookDetailProps {
  book: BookItem;
  onBack: () => void;
  onFavorite?: (bookId: number, isFavorite: boolean) => void;
  isFavorite?: boolean;
}

export const BookDetail = ({
  book,
  onBack,
  onFavorite,
  isFavorite = false
}: BookDetailProps) => {
  const { user, subscription } = useAuth();
  const [showAssistant, setShowAssistant] = useState(false);
  
  const {
    showReader,
    contentUrl,
    isVideo,
    videoId,
    showPremiumModal,
    setShowPremiumModal,
    showWaitModal,
    countdown,
    canReadToday,
    isReading,
    handleReadNow,
    toggleReading,
    handleDownload,
    closeReader
  } = useBookReading(book);

  if (showReader) {
    return (
      <div className="fixed inset-0 bg-background z-50">
        <Button 
          onClick={closeReader} 
          className="fixed top-4 right-4 z-60 bg-primary/20 backdrop-blur-sm border border-primary/30 text-foreground hover:bg-primary/30"
        >
          <X className="h-4 w-4 mr-2" />
          Fechar
        </Button>
        <div className="w-full h-full">
          {isVideo && videoId ? (
            <YouTubePlayer 
              videoId={videoId} 
              onVideoEnd={closeReader} 
              onVideoStart={() => {}} 
            />
          ) : contentUrl ? (
            <iframe 
              src={contentUrl} 
              className="w-full h-full border-0" 
              title={book.livro} 
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms" 
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" onClick={onBack} className="flex items-center gap-2 bg-primary/20 backdrop-blur-sm border border-primary/30 text-foreground hover:bg-primary/30">
        <ArrowLeft className="h-4 w-4" />
        Voltar para biblioteca
      </Button>

      {/* Book Cover and Action Buttons */}
      <Card className="overflow-hidden">
        <CardContent className="p-6 px-[20px]">
          <div className="flex flex-col gap-6">
            {/* Book Cover - Centralized */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-48 h-64 bg-gradient-primary rounded-lg flex items-center justify-center overflow-hidden shadow-lg">
                  {book.imagem ? <img src={book.imagem} alt={book.livro} className="w-full h-full object-cover" /> : <BookOpen className="h-16 w-16 text-primary-foreground" />}
                </div>
                {/* Favorite Heart */}
                {onFavorite && <button onClick={() => onFavorite(book.id, !isFavorite)} className="absolute -top-2 -right-2 w-10 h-10 bg-background/90 backdrop-blur-sm rounded-full flex items-center justify-center border border-border hover:bg-background transition-all duration-200 shadow-lg">
                    <Heart className={`h-5 w-5 transition-colors ${isFavorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground hover:text-red-500'}`} />
                  </button>}
              </div>
            </div>
            
            {/* Book Title and Author - After Cover */}
            <div className="text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground leading-tight">
                {book.livro}
              </h1>
              <p className="text-lg text-primary font-medium">
                por {book.autor}
              </p>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <Button 
                onClick={handleReadNow} 
                disabled={!book.link || (!user && !subscription.subscribed)} 
                className="flex-1 flex items-center justify-center gap-2 h-12 text-sm font-medium"
              >
                {!user ? (
                  <>
                    <Lock className="h-5 w-5" />
                    <span className="hidden xs:inline">Faça Login</span>
                    <span className="xs:hidden">Login</span>
                  </>
                ) : !subscription.subscribed && !canReadToday ? (
                  <>
                    <Lock className="h-5 w-5" />
                    <span className="hidden xs:inline">Limite Diário</span>
                    <span className="xs:hidden">Limite</span>
                  </>
                ) : (
                  <>
                    <BookOpen className="h-5 w-5" />
                    <span className="hidden xs:inline">{subscription.subscribed ? 'Ler Agora' : 'Ler Grátis (30s)'}</span>
                    <span className="xs:hidden">{subscription.subscribed ? 'Ler' : 'Grátis'}</span>
                  </>
                )}
              </Button>
              
              <Button 
                variant={isReading ? "default" : "secondary"}
                onClick={toggleReading}
                className={`flex-1 flex items-center justify-center gap-2 h-12 text-sm font-medium ${isReading ? 'bg-green-600 hover:bg-green-700' : ''}`}
                disabled={!user}
              >
                <BookMarked className="h-5 w-5" />
                <span className="hidden xs:inline">{isReading ? 'Lendo ✓' : 'Marcar como Lendo'}</span>
                <span className="xs:hidden">{isReading ? 'Lendo' : 'Marcar'}</span>
              </Button>
              
              <Button 
                variant="secondary" 
                onClick={handleDownload} 
                className="flex-1 flex items-center justify-center gap-2 h-12 text-sm font-medium"
                disabled={!user}
              >
                <Download className="h-5 w-5" />
                <span className="hidden xs:inline">{subscription.subscription_tier === 'premium' ? 'Download' : 'Premium'}</span>
                <span className="xs:hidden">{subscription.subscription_tier === 'premium' ? 'Down' : 'Pro'}</span>
              </Button>
            </div>

            {/* Book Details */}
            <div className="space-y-6">
              {/* About the Book */}
              {book.sobre && <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Sobre o Livro
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {book.sobre}
                  </p>
                </div>}

              {/* Benefits */}
              {book.beneficios && <div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Benefícios da Leitura
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {book.beneficios}
                  </p>
                </div>}

              {/* Additional Info */}
              <div className="pt-4 border-t border-border">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Autor:</span>
                    <span className="ml-2 text-foreground font-medium">{book.autor}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Categoria:</span>
                    <span className="ml-2 text-foreground font-medium">Clássico</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Leitura Online:</span>
                    <span className="ml-2 text-foreground font-medium">
                      {book.link ? 'Disponível' : 'Indisponível'}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Download:</span>
                    <span className="ml-2 text-foreground font-medium">
                      {book.download ? 'Disponível' : 'Indisponível'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Wait Modal for Free Users */}
      <WaitModal isOpen={showWaitModal} countdown={countdown} />

      {/* Premium Modal */}
      <PremiumModal 
        isOpen={showPremiumModal} 
        onClose={() => setShowPremiumModal(false)} 
      />
      
      {/* Luna Assistant Floating Button - Only visible when reading */}
      {showReader && (
        <Button
          onClick={() => setShowAssistant(true)}
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-xl hover:shadow-2xl hover:scale-110 transition-all duration-300 flex items-center justify-center p-0 z-40"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      )}
      
      {/* Book Assistant */}
      {showAssistant && (
        <BookAssistant 
          onClose={() => setShowAssistant(false)}
          onBookSelect={() => {}}
          currentBook={book}
        />
      )}
    </div>
  );
};