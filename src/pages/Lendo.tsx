import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BookOpen, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNavigation } from '@/components/BottomNavigation';

interface ReadingProgress {
  id: string;
  book_id: number;
  started_reading_at: string;
  last_accessed_at: string;
  is_currently_reading: boolean;
}

export default function Lendo() {
  const { user } = useAuth();
  const [readingBooks, setReadingBooks] = useState<ReadingProgress[]>([]);
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
        setReadingBooks(data || []);
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
          <div className="space-y-4">
            {readingBooks.map((progress) => (
              <Card key={progress.id} className="bg-gradient-card border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <BookOpen className="h-5 w-5 text-primary" />
                    Livro ID: {progress.book_id}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>
                      Último acesso: {new Date(progress.last_accessed_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <div className="mt-3 text-sm">
                    <span className="text-muted-foreground">Iniciado em: </span>
                    <span className="text-foreground">
                      {new Date(progress.started_reading_at).toLocaleDateString('pt-BR')}
                    </span>
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