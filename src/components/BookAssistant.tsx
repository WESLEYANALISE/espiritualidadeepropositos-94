import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Send, BookOpen, X, Sparkles, Crown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BookItem } from '@/pages/Index';

interface BookRecommendation {
  id: string;
  title: string;
  author: string;
  area: string;
  summary: string;
  reason: string;
  image: string;
}

interface AssistantResponse {
  message: string;
  recommendations: BookRecommendation[];
}

interface ChatMessage {
  type: 'user' | 'assistant';
  content: string;
  recommendations?: BookRecommendation[];
  timestamp: Date;
}

interface BookAssistantProps {
  onClose: () => void;
  onBookSelect?: (book: any) => void;
  currentBook?: BookItem;
}

export const BookAssistant = ({ onClose, onBookSelect, currentBook }: BookAssistantProps) => {
  const { subscription } = useAuth();
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      type: 'assistant',
      content: subscription.subscribed 
        ? '👋 Olá! Eu sou a Luna, sua assistente pessoal de livros! ✨\n\nConte-me que tipo de livro você está procurando hoje. Pode ser por tema, gênero, autor ou até mesmo como você está se sentindo. Vou encontrar a recomendação perfeita para você! 📚💫'
        : '👋 Olá! Eu sou a Luna! ✨\n\n🎁 Como usuário gratuito, você pode fazer 1 pergunta para ter uma amostra das minhas recomendações!\n\n👑 Para acesso ilimitado à Luna e todas as recomendações personalizadas, considere adquirir a licença vitalícia! 📚💫',
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [questionsUsed, setQuestionsUsed] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Verificar limites para usuários gratuitos
    if (!subscription.subscribed && questionsUsed >= 1) {
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: '🔒 Você já usou sua pergunta gratuita! \n\n👑 Para acesso ilimitado à Luna e recomendações personalizadas ilimitadas, adquira a licença vitalícia por apenas R$ 9,00!\n\n✨ Com a licença você terá acesso completo a todas as minhas funcionalidades!',
        timestamp: new Date()
      }]);
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Contar pergunta para usuário gratuito
    if (!subscription.subscribed) {
      setQuestionsUsed(prev => prev + 1);
    }

    // Adicionar mensagem do usuário
    setMessages(prev => [...prev, {
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }]);

    try {
      // Buscar todos os livros disponíveis
      const { data: books, error } = await supabase
        .from('01. LIVROS-APP-NOVO')
        .select('*')
        .not('imagem', 'is', null)
        .not('imagem', 'eq', '');

      if (error) {
        throw new Error(`Erro ao buscar livros: ${error.message}`);
      }

      // Preparar dados dos livros para o Gemini
      const booksData = books.map(book => ({
        id: book.id,
        titulo: book.livro,
        autor: book.autor,
        area: book.area,
        sobre: book.sobre,
        imagem: book.imagem
      }));

      // Prompt para o Gemini
      // Add context if reading a specific book
      const bookContext = currentBook 
        ? `Estou lendo o livro "${currentBook.livro}" de ${currentBook.autor}. ${currentBook.sobre ? `Sobre o livro: ${currentBook.sobre}` : ''}`
        : '';
      
      const promptMessage = bookContext ? `${bookContext}\n\nMinha pergunta: ${userMessage}` : userMessage;
      
      const prompt = `
Você é Luna, uma assistente virtual especialista em recomendação de livros, muito amigável e carismática. 

LIVROS DISPONÍVEIS:
${JSON.stringify(booksData, null, 2)}

INSTRUÇÕES:
1. Seja sempre muito amigável, carismática e use uma linguagem calorosa
2. Analise a solicitação do usuário: "${promptMessage}"
3. Recomende 1-3 livros que melhor se encaixam na solicitação
4. Para cada livro recomendado, forneça:
   - Título completo
   - Breve resumo (2-3 frases)
   - Por que é uma boa escolha para o usuário
5. Use emojis para tornar a conversa mais amigável
6. Se não encontrar livros adequados, seja honesta mas ofereça alternativas próximas

FORMATO DA RESPOSTA:
Responda em JSON com esta estrutura:
{
  "message": "sua mensagem amigável aqui",
  "recommendations": [
    {
      "id": "id do livro",
      "title": "título do livro",
      "author": "autor",
      "area": "área do livro",
      "summary": "resumo breve",
      "reason": "por que recomenda",
      "image": "url da imagem"
    }
  ]
}
`;

      // Chamar API do Gemini diretamente
      const geminiResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-goog-api-key': 'AIzaSyBX7qgNnl7_1hcCqAO62aWFM7dBDDbBIbw'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.7,
            topP: 0.8,
            maxOutputTokens: 2048
          }
        })
      });

      if (!geminiResponse.ok) {
        throw new Error(`Erro na API do Gemini: ${geminiResponse.statusText}`);
      }

      const geminiData = await geminiResponse.json();
      const responseText = geminiData.candidates[0].content.parts[0].text;

      // Tentar extrair JSON da resposta
      let assistantResponse;
      try {
        // Procurar por JSON na resposta
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          assistantResponse = JSON.parse(jsonMatch[0]);
        } else {
          // Se não encontrar JSON, criar resposta padrão
          assistantResponse = {
            message: responseText,
            recommendations: []
          };
        }
      } catch (parseError) {
        // Se falhar ao fazer parse, retornar resposta simples
        assistantResponse = {
          message: responseText,
          recommendations: []
        };
      }

      // Adicionar resposta da assistente
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: assistantResponse.message,
        recommendations: assistantResponse.recommendations,
        timestamp: new Date()
      }]);

    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      setMessages(prev => [...prev, {
        type: 'assistant',
        content: '😅 Ops! Tive um pequeno problema aqui. Pode tentar novamente? Prometo que vou caprichar na recomendação! 💪',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleBookClick = async (recommendation: BookRecommendation) => {
    try {
      // Buscar dados completos do livro
      const { data: book, error } = await supabase
        .from('01. LIVROS-APP-NOVO')
        .select('*')
        .eq('id', parseInt(recommendation.id))
        .single();

      if (error) {
        console.error('Erro ao buscar livro:', error);
        return;
      }

      if (onBookSelect) {
        onBookSelect(book);
      }
      onClose();
    } catch (error) {
      console.error('Erro ao selecionar livro:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl h-[600px] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">
                {currentBook ? `Luna - ${currentBook.livro}` : 'Luna - Assistente de Livros'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {currentBook 
                  ? `Tire suas dúvidas sobre "${currentBook.livro}"` 
                  : 'Sua especialista em recomendações literárias'}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message, index) => (
            <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] ${message.type === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'} rounded-lg p-3`}>
                <div className="whitespace-pre-line text-sm">
                  {message.content}
                </div>
                
                {message.recommendations && message.recommendations.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {message.recommendations.map((book, bookIndex) => (
                      <Card key={bookIndex} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => handleBookClick(book)}>
                        <CardContent className="p-3">
                          <div className="flex gap-3">
                            <img 
                              src={book.image} 
                              alt={book.title}
                              className="w-16 h-20 object-cover rounded flex-shrink-0"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = '/placeholder.svg';
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold text-sm line-clamp-2">{book.title}</h4>
                              {book.author && (
                                <p className="text-xs text-muted-foreground mt-1">{book.author}</p>
                              )}
                              <p className="text-xs text-muted-foreground mt-1">📚 {book.area}</p>
                              <p className="text-xs mt-2 line-clamp-2">{book.summary}</p>
                              <p className="text-xs text-primary mt-1 line-clamp-1">💡 {book.reason}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                            <BookOpen className="h-3 w-3" />
                            <span>Clique para ver detalhes</span>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="animate-spin w-4 h-4 border-2 border-primary border-t-transparent rounded-full"></div>
                  Luna está pensando...
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 border-t">
          {!subscription.subscribed && (
            <div className="mb-3 p-2 bg-primary/10 rounded-lg text-center">
              <p className="text-xs text-muted-foreground">
                {questionsUsed >= 1 ? (
                  <>🔒 Limite atingido - <Button variant="link" className="p-0 h-auto text-xs text-primary" onClick={() => window.location.href = '/assinaturas'}>Adquira a licença vitalícia</Button></>
                ) : (
                  <>🎁 Pergunta gratuita: {1 - questionsUsed} restante - <Button variant="link" className="p-0 h-auto text-xs text-primary" onClick={() => window.location.href = '/assinaturas'}>Upgrade para ilimitado</Button></>
                )}
              </p>
            </div>
          )}
          <div className="flex gap-2">
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={subscription.subscribed ? "Descreva que tipo de livro você procura..." : questionsUsed >= 1 ? "Adquira a licença para continuar..." : "Sua pergunta gratuita..."}
              disabled={isLoading || (!subscription.subscribed && questionsUsed >= 1)}
              className="flex-1"
            />
            <Button onClick={sendMessage} disabled={isLoading || !inputMessage.trim() || (!subscription.subscribed && questionsUsed >= 1)}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            {subscription.subscribed ? (
              <>👑 Acesso ilimitado ativo! <Crown className="inline h-3 w-3 text-primary" /></>
            ) : (
              <>💡 Dica: Seja específico sobre seus interesses para recomendações mais precisas!</>
            )}
          </p>
        </div>
      </Card>
    </div>
  );
};