import { BookAssistant } from '@/components/BookAssistant';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export default function Luna() {
  const navigate = useNavigate();

  const handleBookSelect = (book: any) => {
    // Navigate to home with the selected book
    navigate('/', { state: { selectedBook: book } });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border/50">
        <div className="container mx-auto max-w-4xl px-4 py-3">
          <Button
            onClick={() => navigate(-1)}
            variant="ghost"
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        </div>
      </div>
      
      <div className="container mx-auto max-w-4xl px-4 py-6">
        <BookAssistant 
          onClose={() => navigate(-1)}
          onBookSelect={handleBookSelect}
        />
      </div>
    </div>
  );
}