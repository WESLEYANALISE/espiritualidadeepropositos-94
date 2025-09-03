import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, BookOpen, User } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNavigation } from '@/components/BottomNavigation';

interface FavoriteBook {
  id: string;
  book_id: number;
  user_ip: string;
  created_at: string;
  bookData?: {
    livro: string;
    autor: string;
    imagem: string;
    area: string;
    sobre: string;
  };
}

export default function Favoritos() {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFavorites = async () => {
      if (!user) return;

      try {
        // First get favorites from localStorage
        const localFavorites = localStorage.getItem('favoriteBooks');
        if (localFavorites) {
          const favoriteIds = JSON.parse(localFavorites);
          
          // Fetch book data for each favorite
          const favoritesWithData = await Promise.all(
            favoriteIds.map(async (bookId: number) => {
              try {
                const { data: bookData } = await supabase
                  .from('01. LIVROS-APP-NOVO')
                  .select('*')
                  .eq('id', bookId)
                  .single();

                return {
                  id: `local-${bookId}`,
                  book_id: bookId,
                  user_ip: 'user-' + user.id,
                  created_at: new Date().toISOString(),
                  bookData: bookData ? {
                    livro: bookData.livro || 'Título não disponível',
                    autor: bookData.autor || 'Autor não especificado',
                    imagem: bookData.imagem,
                    area: bookData.area || 'Sem categoria',
                    sobre: bookData.sobre || ''
                  } : undefined
                };
              } catch (error) {
                console.error('Error fetching book data for ID:', bookId, error);
                return null;
              }
            })
          );

          setFavorites(favoritesWithData.filter(Boolean) as FavoriteBook[]);
        }
      } catch (error) {
        console.error('Error fetching favorites:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFavorites();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-6 pb-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Faça login para ver seus favoritos
            </h2>
            <p className="text-muted-foreground">
              Entre em sua conta para acessar seus livros favoritos
            </p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-6 pb-20">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            Meus Favoritos
          </h1>
          <p className="text-muted-foreground">
            Seus livros marcados como favoritos
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-32 bg-muted rounded mb-4"></div>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : favorites.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhum favorito ainda
            </h2>
            <p className="text-muted-foreground">
              Marque livros como favoritos para vê-los aqui
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {favorites.map((favorite) => (
              <Card key={favorite.id} className="bg-gradient-card border-primary/20 hover:shadow-elevated transition-all duration-300 cursor-pointer group">
                <CardContent className="p-4">
                  <div className="relative h-32 bg-gradient-primary rounded-lg mb-3 overflow-hidden group-hover:shadow-md transition-shadow">
                    {favorite.bookData?.imagem ? (
                      <img 
                        src={favorite.bookData.imagem} 
                        alt={favorite.bookData.livro}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div className={`absolute inset-0 flex items-center justify-center ${favorite.bookData?.imagem ? 'hidden' : ''}`}>
                      <BookOpen className="h-12 w-12 text-primary-foreground" />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
                      {favorite.bookData?.livro || `Livro ID: ${favorite.book_id}`}
                    </h3>
                    {favorite.bookData?.autor && (
                      <p className="text-sm text-muted-foreground line-clamp-1">
                        por {favorite.bookData.autor}
                      </p>
                    )}
                    {favorite.bookData?.area && (
                      <div className="text-xs text-primary bg-primary/10 px-2 py-1 rounded-full w-fit">
                        {favorite.bookData.area}
                      </div>
                    )}
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Heart className="h-3 w-3 text-red-500 fill-red-500" />
                      <span>Favoritado</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
      
      <BottomNavigation />
    </div>
  );
}