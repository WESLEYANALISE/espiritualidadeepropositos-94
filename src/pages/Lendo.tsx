import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Clock, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNavigation } from '@/components/BottomNavigation';
import { BookItem } from '@/pages/Index';

interface ReadingProgress {
  id: string;
  book_id: number;
  started_reading_at: string;
  last_accessed_at: string;
  is_currently_reading: boolean;
}

interface ReadingBook extends ReadingProgress {
  book_data?: BookItem;
}

export default function Lendo() {
  const { user } = useAuth();
  const [readingBooks, setReadingBooks] = useState<ReadingBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReadingProgress = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('book_reading_progress')
          .select('*')
          .eq('user_ip', user.id) // Using user.id as identifier
          .eq('is_currently_reading', true)
          .order('last_accessed_at', { ascending: false });

        if (error) throw error;
        
        const booksWithData: ReadingBook[] = [];
        
        // Fetch book details for each reading progress
        for (const progress of data || []) {
          try {
            const { data: bookData } = await supabase
              .from("01. LIVROS-APP-NOVO" as any)
              .select("*")
              .eq("id", progress.book_id)
              .single();
            
            if (bookData && typeof bookData === 'object' && !('error' in bookData!)) {
              const book = bookData as any;
              booksWithData.push({
                ...progress,
                book_data: {
                  id: book?.id ?? progress.book_id,
                  livro: book?.livro ?? 'Livro sem título',
                  autor: book?.autor ?? 'Autor não especificado',
                  sobre: book?.sobre ?? '',
                  imagem: book?.imagem ?? '',
                  link: book?.link ?? '',
                  download: book?.download ?? '',
                  beneficios: book?.beneficios ?? ''
                }
              });
            }
          } catch (bookError) {
            console.error('Error fetching book data for ID:', progress.book_id, bookError);
            // Still add the progress without book data
            booksWithData.push(progress);
          }
        }
        
        setReadingBooks(booksWithData);
      } catch (error) {
        console.error('Error fetching reading progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchReadingProgress();
  }, [user]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-6 pb-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Faça login para ver seus livros
            </h2>
            <p className="text-muted-foreground">
              Entre em sua conta para acompanhar seu progresso de leitura
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
            Lendo Agora
          </h1>
          <p className="text-muted-foreground">
            Acompanhe seu progresso de leitura
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : readingBooks.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhum livro sendo lido
            </h2>
            <p className="text-muted-foreground">
              Comece a ler um livro para vê-lo aqui
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {readingBooks.map((progress) => (
              <Card key={progress.id} className="bg-gradient-card border-primary/20 hover:shadow-luxury transition-all duration-300">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    {/* Book Cover */}
                    <div className="flex-shrink-0">
                      <div className="w-16 h-20 bg-gradient-primary rounded-lg flex items-center justify-center overflow-hidden shadow-card">
                        {progress.book_data?.imagem ? (
                          <img 
                            src={progress.book_data.imagem} 
                            alt={progress.book_data.livro} 
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <BookOpen className="h-6 w-6 text-primary-foreground" />
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground text-sm line-clamp-2 flex items-center gap-2 mb-1">
                        <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                        {progress.book_data?.livro || `Livro ID: ${progress.book_id}`}
                      </h3>
                      
                      {progress.book_data?.autor && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mb-2">
                          por {progress.book_data.autor}
                        </p>
                      )}

                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            Último acesso: {new Date(progress.last_accessed_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>
                            Iniciado: {new Date(progress.started_reading_at).toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>

                      {progress.book_data?.sobre && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mt-2 bg-primary/5 p-2 rounded border-l-2 border-primary/20">
                          {progress.book_data.sobre}
                        </p>
                      )}
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