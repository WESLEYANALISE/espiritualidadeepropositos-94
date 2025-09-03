import { useState, useEffect, useRef } from "react";
import { Search, Book, X } from "lucide-react";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";
import { BookItem } from "@/pages/Index";

interface GlobalSearchProps {
  onBookSelect: (book: BookItem, area: string) => void;
}

export const GlobalSearch = ({ onBookSelect }: GlobalSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<(BookItem & { area: string })[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const searchBooks = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        setIsOpen(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("01. LIVROS-APP-NOVO")
          .select("*")
          .or(`livro.ilike.%${searchQuery}%,autor.ilike.%${searchQuery}%`)
          .not('imagem', 'is', null)
          .not('imagem', 'eq', '')
          .limit(10);

        if (error) {
          console.error("Error searching books:", error);
          return;
        }

        const books = (data || []).map((item: any) => ({
          id: item.id,
          livro: item.livro || 'Sem título',
          autor: item.autor || 'Autor não especificado',
          sobre: item.sobre || '',
          imagem: item.imagem,
          link: item.link,
          download: item.download || null,
          beneficios: item.beneficios || null,
          area: item.area || 'Sem categoria'
        }));

        setSearchResults(books);
        setIsOpen(books.length > 0);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchBooks, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  const handleBookClick = (book: BookItem & { area: string }) => {
    onBookSelect(book, book.area);
    setSearchQuery("");
    setIsOpen(false);
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSearchResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative max-w-md mx-auto" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Pesquisar livros ou autores..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 pr-10 bg-surface-elevated border-border"
        />
        {searchQuery && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 max-h-[400px] overflow-y-auto z-50 bg-surface-elevated border-border shadow-luxury animate-in slide-in-from-top-2 duration-200">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              <span className="text-sm">Buscando livros...</span>
            </div>
          ) : searchResults.length > 0 ? (
            <div className="py-1">
              {searchResults.map((book) => (
                <div
                  key={book.id}
                  onClick={() => handleBookClick(book)}
                  className="flex items-center gap-3 p-3 hover:bg-primary/5 cursor-pointer border-b border-border/30 last:border-b-0 transition-all duration-200 hover:shadow-sm group"
                >
                  <div className="w-10 h-12 bg-gradient-primary rounded-md flex items-center justify-center flex-shrink-0 overflow-hidden shadow-sm group-hover:shadow-md transition-shadow">
                    {book.imagem ? (
                      <img 
                        src={book.imagem} 
                        alt={book.livro}
                        className="w-full h-full object-cover rounded-md group-hover:scale-105 transition-transform duration-200"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <Book className={`h-4 w-4 text-primary-foreground ${book.imagem ? 'hidden' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-foreground text-sm line-clamp-1 group-hover:text-primary transition-colors">
                      {book.livro}
                    </div>
                    {book.autor && (
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        por {book.autor}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <div className="text-xs text-primary/80 bg-primary/10 px-2 py-0.5 rounded-full">
                        {book.area}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        📖 Clique para ver
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center text-muted-foreground">
              <Book className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum livro encontrado</p>
              <p className="text-xs mt-1">Tente uma busca diferente</p>
            </div>
          )}
        </Card>
      )}
    </div>
  );
};