import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BookCard } from "./BookCard";
import { BookItem } from "@/pages/Index";
import { Loader2, Search } from "lucide-react";
import { Input } from "./ui/input";

interface BooksGridProps {
  selectedArea: string;
  onBookClick: (book: BookItem) => void;
  onBack: () => void;
  readBooks: Set<number>;
  onStatsUpdate?: (total: number, available: number) => void;
  highlightedBookId?: number | null;
  onFavorite?: (bookId: number, isFavorite: boolean) => void;
  favoriteBooks?: Set<number>;
}

export const BooksGrid = ({ selectedArea, onBookClick, onBack, readBooks, onStatsUpdate, highlightedBookId, onFavorite, favoriteBooks = new Set() }: BooksGridProps) => {
  const [books, setBooks] = useState<BookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredBooks, setFilteredBooks] = useState<BookItem[]>([]);

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const { data, error } = await supabase
          .from("01. LIVROS-APP-NOVO" as any)
          .select("*")
          .eq("area", selectedArea)
          .order("id", { ascending: false });

        if (error) {
          console.error("Error fetching books:", error);
          return;
        }

        // Map the data to match our BookItem interface
        const booksData = (data || []).map((item: any) => ({
          id: item.id,
          livro: item.livro || 'Sem título',
          autor: item.autor || 'Autor não especificado',
          sobre: item.sobre || '',
          imagem: item.imagem,
          link: item.link,
          download: item.download || null,
          beneficios: item.beneficios || null
        })) as BookItem[];
        
        // Sort books alphabetically by title
        const sortedBooks = booksData.sort((a, b) => a.livro.localeCompare(b.livro));
        setBooks(sortedBooks);
        setFilteredBooks(sortedBooks);
        
        // Update stats
        const availableDownloads = booksData.filter(book => book.download).length;
        onStatsUpdate?.(booksData.length, availableDownloads);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchBooks();
  }, [selectedArea, onStatsUpdate]);

  useEffect(() => {
    const filtered = books.filter(book =>
      book.livro.toLowerCase().includes(searchQuery.toLowerCase()) ||
      book.autor.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredBooks(filtered);
  }, [searchQuery, books]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Carregando livros...</span>
        </div>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="text-center py-20">
        <h3 className="text-lg font-medium text-foreground mb-2">
          Nenhum livro encontrado
        </h3>
        <p className="text-muted-foreground">
          Aguarde novos livros clássicos
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-10">
        <button
          onClick={onBack}
          className="flex items-center gap-3 bg-surface-luxury/80 backdrop-blur-sm border border-border/50 text-foreground hover:bg-surface-luxury hover:border-primary/30 px-5 py-3 rounded-xl transition-all duration-300 hover:shadow-elevated font-medium"
        >
          ← Voltar para áreas
        </button>
      </div>
      <div className="text-center mb-12">
        <div className="relative inline-block mb-6">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
            {selectedArea}
          </h2>
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-20 h-1 bg-gradient-primary rounded-full" />
        </div>
        <p className="text-lg text-muted-foreground mb-8 max-w-lg mx-auto leading-relaxed">
          Explore nossa coleção cuidadosamente selecionada de obras fundamentais
        </p>
        
        <div className="relative max-w-lg mx-auto">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Pesquisar por título ou autor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 pr-4 py-3 bg-surface-elevated/80 border-border/50 rounded-xl shadow-card backdrop-blur-sm focus:bg-surface-elevated focus:border-primary/30 focus:shadow-elevated transition-all duration-300 text-base"
          />
        </div>
      </div>
      
      <div className="grid gap-3 sm:gap-4 md:gap-6">
        {filteredBooks.map((item) => (
          <div 
            key={item.id}
            data-book-id={item.id}
            className={`transition-all duration-500 ${
              highlightedBookId === item.id 
                ? 'ring-2 ring-yellow-400 ring-opacity-70 rounded-lg transform scale-[1.02]' 
                : ''
            }`}
          >
            <BookCard
              book={{...item, isRead: readBooks.has(item.id)}}
              onClick={() => onBookClick(item)}
              onFavorite={onFavorite}
              isFavorite={favoriteBooks.has(item.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};