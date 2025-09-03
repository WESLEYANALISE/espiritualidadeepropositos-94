import { useState, useEffect } from "react";
import { BooksGrid } from "@/components/BooksGrid";
import { BookDetail } from "@/components/BookDetail";
import { Header } from "@/components/Header";
import { AreasGrid } from "@/components/AreasGrid";
import { FloatingButton } from "@/components/FloatingButton";
import { BottomNavigation } from "@/components/BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { User, Crown } from "lucide-react";
import { AdBanner1 } from "@/components/ads/AdBanner1";
import { AdBanner2 } from "@/components/ads/AdBanner2";
import { AdBanner3 } from "@/components/ads/AdBanner3";
import { BookAssistant } from "@/components/BookAssistant";
import { useSubscriptionLimits } from "@/hooks/useSubscriptionLimits";
export interface BookItem {
  id: number;
  livro: string;
  autor: string;
  sobre: string;
  imagem: string;
  link: string;
  download?: string;
  beneficios?: string;
  isRead?: boolean;
}
const Index = () => {
  const { user, subscription, subscriptionLoading, checkSubscription } = useAuth();
  const { checkFavoriteLimit } = useSubscriptionLimits();
  
  // Debug: log do estado atual da assinatura
  console.log('🎯 [INDEX] Estado atual:', {
    subscription,
    subscriptionLoading,
    userEmail: user?.email
  });
  const [selectedBook, setSelectedBook] = useState<BookItem | null>(null);
  const [selectedArea, setSelectedArea] = useState<string | null>(null);
  const [readBooks, setReadBooks] = useState<Set<number>>(new Set());
  const [favoriteBooks, setFavoriteBooks] = useState<Set<number>>(new Set());
  const [recentBooks, setRecentBooks] = useState<BookItem[]>([]);
  const [totalBooks, setTotalBooks] = useState(0);
  const [availableBooks, setAvailableBooks] = useState(0);
  const [highlightedBookId, setHighlightedBookId] = useState<number | null>(null);
  const [showAssistant, setShowAssistant] = useState(false);

  // Debug: monitor mudanças no estado da assinatura
  useEffect(() => {
    console.log('🎯 [INDEX] Estado da assinatura mudou:', {
      subscription,
      subscriptionLoading,
      timestamp: new Date().toISOString()
    });
  }, [subscription, subscriptionLoading]);

  // Load favorites and recent books from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('favoriteBooks');
    const savedRecent = localStorage.getItem('recentBooks');
    if (savedFavorites) {
      setFavoriteBooks(new Set(JSON.parse(savedFavorites)));
    }
    if (savedRecent) {
      setRecentBooks(JSON.parse(savedRecent));
    }
  }, []);
  const handleBookSelect = (book: BookItem, area: string) => {
    setSelectedArea(area);
    setHighlightedBookId(book.id);

    // Smooth scroll to highlighted book after area loads
    setTimeout(() => {
      const bookElement = document.querySelector(`[data-book-id="${book.id}"]`);
      if (bookElement) {
        bookElement.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    }, 500);

    // Remove highlight after 5 seconds
    setTimeout(() => {
      setHighlightedBookId(null);
    }, 5000);
  };
  const handleBookClick = (book: BookItem) => {
    // Add to recent books
    setRecentBooks(prev => {
      const filtered = prev.filter(b => b.id !== book.id);
      const newRecent = [book, ...filtered].slice(0, 10);
      localStorage.setItem('recentBooks', JSON.stringify(newRecent));
      return newRecent;
    });
    setReadBooks(prev => new Set(prev.add(book.id)));
    setSelectedBook(book);
  };
  const handleFavorite = (bookId: number, isFavorite: boolean) => {
    if (isFavorite && !checkFavoriteLimit()) {
      return; // Block if limit reached
    }
    
    setFavoriteBooks(prev => {
      const newFavorites = new Set(prev);
      if (isFavorite) {
        newFavorites.add(bookId);
      } else {
        newFavorites.delete(bookId);
      }
      localStorage.setItem('favoriteBooks', JSON.stringify(Array.from(newFavorites)));
      return newFavorites;
    });
  };
  const favoriteBookItems = recentBooks.filter(book => favoriteBooks.has(book.id));
  return <div className="min-h-screen bg-background pb-48">{/* pb-48 for bottom navigation + banner */}
      {!selectedArea && !selectedBook && (
        <>
          <Header totalBooks={totalBooks} availableBooks={availableBooks} onBookSelect={handleBookSelect} />
          <div className="container mx-auto max-w-4xl px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                {user ? (
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => window.location.href = '/configuracoes'}
                  >
                    <div className="w-10 h-10 bg-gradient-primary rounded-full flex items-center justify-center">
                      <User className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        Olá, {user.email?.split('@')[0]}
                      </p>
                  <div className="flex items-center justify-between">
                    <div>
                       <p className="text-xs text-muted-foreground">
                         {(() => {
                           const result = subscription.subscribed ? (
                             `✨ ${subscription.subscription_tier}`
                           ) : subscriptionLoading ? (
                             <span className="flex items-center gap-1">
                               <div className="animate-spin h-3 w-3 border border-primary border-t-transparent rounded-full"></div>
                               Verificando...
                             </span>
                           ) : (
                             'Usuário gratuito'
                           );
                           console.log('🎯 [INDEX] Renderizando status:', result, { subscription, subscriptionLoading });
                           return result;
                         })()}
                       </p>
                    </div>
                  </div>
                    </div>
                  </div>
                ) : (
                  <Button onClick={() => window.location.href = '/auth'} variant="outline">
                    <User className="h-4 w-4 mr-2" />
                    Fazer Login
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={() => window.location.href = '/assinaturas'} 
                  className="bg-gradient-primary"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  {subscription.subscribed ? 'Vitalício ✨' : 'Planos'}
                </Button>
                
                {/* Botão da Assistente - Esconder no mobile */}
                <Button 
                  onClick={() => setShowAssistant(true)} 
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg hidden sm:flex"
                >
                  ✨ Luna
                </Button>
              </div>
            </div>
          </div>
          <AdBanner1 />
        </>
      )}
      <main className="container mx-auto py-6 max-w-4xl px-[8px]">
        {selectedBook ? <BookDetail book={selectedBook} onBack={() => setSelectedBook(null)} onFavorite={handleFavorite} isFavorite={favoriteBooks.has(selectedBook.id)} /> : selectedArea ? (
          <>
            <AdBanner2 />
            <BooksGrid selectedArea={selectedArea} onBookClick={handleBookClick} onBack={() => {
              setSelectedArea(null);
              setHighlightedBookId(null);
            }} readBooks={readBooks} onStatsUpdate={(total, available) => {
              setTotalBooks(total);
              setAvailableBooks(available);
            }} highlightedBookId={highlightedBookId} onFavorite={handleFavorite} favoriteBooks={favoriteBooks} />
            <AdBanner3 />
          </>
        ) : (
          <AreasGrid onAreaClick={setSelectedArea} onBookSelect={handleBookSelect} />
        )}
      </main>
      
      <FloatingButton recentBooks={recentBooks} favoriteBooks={favoriteBookItems} onBookClick={handleBookClick} />
      <BottomNavigation />
      
      {/* Assistente de Livros */}
      {showAssistant && (
        <BookAssistant 
          onClose={() => setShowAssistant(false)}
          onBookSelect={handleBookClick}
        />
      )}
    </div>;
};
export default Index;