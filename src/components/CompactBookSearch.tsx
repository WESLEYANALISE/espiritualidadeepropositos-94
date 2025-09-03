import { useState, useEffect, useRef } from "react";
import { Search, Book, Plus } from "lucide-react";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { supabase } from "@/integrations/supabase/client";

interface BookSuggestion {
  id: number;
  livro: string;
  autor: string;
  imagem: string;
  sobre: string;
  area: string;
}

interface CompactBookSearchProps {
  onBookSelect: (book: BookSuggestion) => void;
  placeholder?: string;
}

export const CompactBookSearch = ({ onBookSelect, placeholder = "Digite o nome do livro..." }: CompactBookSearchProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<BookSuggestion[]>([]);
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
        setSuggestions([]);
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
          .limit(5);

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
          area: item.area || 'Sem categoria'
        }));

        setSuggestions(books);
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

  const handleBookClick = (book: BookSuggestion) => {
    onBookSelect(book);
    setSearchQuery(book.livro);
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={searchRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 bg-surface-elevated border-border/50 focus:border-primary/50"
        />
      </div>

      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-1 max-h-64 overflow-y-auto z-50 bg-surface-elevated border-border/50 shadow-luxury animate-in slide-in-from-top-1 duration-150">
          {loading ? (
            <div className="p-3 text-center">
              <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            </div>
          ) : suggestions.length > 0 ? (
            <div className="py-1">
              {suggestions.map((book) => (
                <div
                  key={book.id}
                  onClick={() => handleBookClick(book)}
                  className="flex items-center gap-3 p-2 hover:bg-primary/5 cursor-pointer transition-colors duration-150"
                >
                  <div className="w-8 h-10 bg-gradient-primary rounded flex items-center justify-center overflow-hidden flex-shrink-0">
                    {book.imagem ? (
                      <img 
                        src={book.imagem} 
                        alt={book.livro}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.style.display = 'none';
                          target.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <Book className={`h-3 w-3 text-primary-foreground ${book.imagem ? 'hidden' : ''}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-foreground line-clamp-1">
                      {book.livro}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-1">
                      {book.autor}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" className="h-6 w-6 p-0 flex-shrink-0">
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 text-center text-sm text-muted-foreground">
              Nenhum livro encontrado
            </div>
          )}
        </Card>
      )}
    </div>
  );
};