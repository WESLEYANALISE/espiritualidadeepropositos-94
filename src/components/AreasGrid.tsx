import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { Carousel, CarouselContent, CarouselItem } from "./ui/carousel";
import Autoplay from "embla-carousel-autoplay";
import { GlobalSearch } from "./GlobalSearch";
import { BookItem } from "@/pages/Index";

interface Area {
  name: string;
  count: number;
  capaArea: string;
}

interface RecentBook {
  livro: string;
  imagem: string;
}

interface AreasGridProps {
  onAreaClick: (area: string) => void;
  onBookSelect?: (book: BookItem, area: string) => void;
}

export const AreasGrid = ({
  onAreaClick,
  onBookSelect
}: AreasGridProps) => {
  const [areas, setAreas] = useState<Area[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentBooks, setRecentBooks] = useState<RecentBook[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recent books
        const {
          data: booksData
        } = await supabase.from("01. LIVROS-APP-NOVO" as any).select("livro, imagem").not("imagem", "is", null).neq("imagem", "").order("id", {
          ascending: false
        }).limit(10);
        if (booksData) {
          const mappedBooks = (booksData || []).map((item: any) => ({
            livro: item.livro || '',
            imagem: item.imagem || ''
          }));
          setRecentBooks(mappedBooks);
        }

        // Fetch areas with their covers
        const {
          data: areasData,
          error
        } = await supabase.from("01. LIVROS-APP-NOVO" as any).select("area, capa-area").not("area", "is", null).not("capa-area", "is", null);
        if (error) {
          console.error("Error fetching areas:", error);
          return;
        }

        // Group by area and get unique areas with their covers
        const areaMap = new Map<string, { count: number; capaArea: string }>();
        
        (areasData || []).forEach((item: any) => {
          const area = item.area;
          const capaArea = item["capa-area"];
          
          if (area && capaArea) {
            if (areaMap.has(area)) {
              areaMap.get(area)!.count++;
            } else {
              areaMap.set(area, { count: 1, capaArea });
            }
          }
        });

        // Create areas array and sort alphabetically
        const areasDataFormatted = Array.from(areaMap.entries())
          .map(([areaName, data]) => ({
            name: areaName,
            count: data.count,
            capaArea: data.capaArea
          }))
          .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
        
        setAreas(areasDataFormatted);
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-muted-foreground">Carregando áreas...</span>
        </div>
      </div>;
  }

  return <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-4xl py-0 my-0 px-[7px]">
        <div className="text-center mb-6 animate-fade-in-up">
          <div className="relative inline-block mb-3">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent leading-tight">Biblioteca Digital</h1>
            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-16 h-0.5 bg-gradient-primary rounded-full" />
          </div>
          <p className="text-sm md:text-base text-muted-foreground max-w-2xl mx-auto leading-relaxed">Explore nossa coleção de livros por categoria</p>
        </div>

        {/* Global Search */}
        {onBookSelect && <div className="mb-6 animate-scale-in">
            <GlobalSearch onBookSelect={onBookSelect} />
          </div>}

        {/* Recent Books Carousel */}
        {recentBooks.length > 0 && <div className="mb-8">
            <div className="text-center mb-4">
              <h2 className="text-lg md:text-xl font-bold text-foreground mb-1">
                Últimos Livros Adicionados
              </h2>
              <p className="text-sm text-muted-foreground">
                Descubra as mais recentes adições ao nosso acervo
              </p>
            </div>
            <Carousel plugins={[Autoplay({
          delay: 2000,
          stopOnInteraction: false,
          stopOnMouseEnter: true
        })]} className="w-full max-w-4xl mx-auto" opts={{
          align: "start",
          loop: true
        }}>
              <CarouselContent className="-ml-1 md:-ml-2">
                {recentBooks.map((book, index) => <CarouselItem key={index} className="pl-1 md:pl-2 basis-1/4 md:basis-1/6">
                    <div className="group flex flex-col items-center">
                      <div className="relative overflow-hidden rounded-lg shadow-card hover:shadow-elevated transition-all duration-300">
                        <img src={book.imagem} alt={book.livro} className="w-16 h-20 md:w-20 md:h-26 object-cover group-hover:scale-105 transition-transform duration-500" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-1 line-clamp-2 max-w-[64px] md:max-w-[80px] leading-tight">{book.livro}</p>
                    </div>
                  </CarouselItem>)}
              </CarouselContent>
            </Carousel>
          </div>}
        
        {/* Subtle separator */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-px bg-border opacity-50"></div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6 animate-fade-in-up">
          {areas.map((area, index) => (
            <div 
              key={area.name} 
              className="cursor-pointer group transition-all duration-300 hover:scale-105 card-hover animate-fade-in-up"
              style={{ animationDelay: `${index * 0.1}s` }}
              onClick={() => onAreaClick(area.name)}
            >
              <div className="relative aspect-[2/3] rounded-lg overflow-hidden shadow-card hover:shadow-elevated transition-all duration-300">
                <img 
                  src={area.capaArea} 
                  alt={`Capa da categoria ${area.name}`}
                  className="w-full h-full object-cover"
                />
                
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                
                {/* Shimmer animation */}
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 animate-shimmer"></div>
                </div>
                
                {/* Category name */}
                <div className="absolute inset-0 flex items-end justify-center p-4">
                  <div className="text-center">
                    <h3 className="text-lg md:text-xl font-bold text-white leading-tight drop-shadow-lg text-shadow-lg">
                      {area.name}
                    </h3>
                  </div>
                </div>
                
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>;
};