import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { BookItem } from "@/pages/Index";
import { isYouTubeUrl, extractYouTubeId } from "@/lib/utils";

export const useBookReading = (book: BookItem) => {
  const { user, subscription } = useAuth();
  const { toast } = useToast();
  
  const [showReader, setShowReader] = useState(false);
  const [contentUrl, setContentUrl] = useState<string | null>(null);
  const [isVideo, setIsVideo] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [showWaitModal, setShowWaitModal] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [canReadToday, setCanReadToday] = useState(true);
  const [hasUsedFreeRead, setHasUsedFreeRead] = useState(false);
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    checkDailyFreeRead();
    checkIfReading();
  }, [user]);

  const checkDailyFreeRead = async () => {
    if (!user) return;
    setCanReadToday(true);
    setHasUsedFreeRead(false);
  };

  const checkIfReading = () => {
    if (!user) return;
    const readingBooks = JSON.parse(localStorage.getItem(`reading_books_${user.id}`) || '[]');
    setIsReading(readingBooks.includes(book.id));
  };

  const toggleReading = () => {
    if (!user) return;
    
    const readingBooks = JSON.parse(localStorage.getItem(`reading_books_${user.id}`) || '[]');
    let updatedBooks;
    
    if (isReading) {
      updatedBooks = readingBooks.filter((id: number) => id !== book.id);
      toast({
        title: '📚 Removido da lista',
        description: 'Livro removido dos que você está lendo',
        duration: 2000,
      });
    } else {
      updatedBooks = [...readingBooks, book.id];
      toast({
        title: '📖 Adicionado à lista!',
        description: 'Livro marcado como "Lendo"',
        duration: 2000,
      });
    }
    
    localStorage.setItem(`reading_books_${user.id}`, JSON.stringify(updatedBooks));
    setIsReading(!isReading);
  };

  const handleReadNow = async () => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para ler os livros.',
        variant: 'destructive',
      });
      return;
    }

    if (subscription.subscribed) {
      startReading();
      await recordBookAccess();
      return;
    }

    if (!canReadToday) {
      toast({
        title: 'Limite diário atingido',
        description: 'Você já leu um livro hoje. Assine um plano para leitura ilimitada.',
        variant: 'destructive',
      });
      setShowPremiumModal(true);
      return;
    }

    setShowWaitModal(true);
    setCountdown(30);
    
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setShowWaitModal(false);
          startReading();
          recordDailyFreeRead();
          recordBookAccess();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const startReading = () => {
    if (book.link) {
      if (isYouTubeUrl(book.link)) {
        const id = extractYouTubeId(book.link);
        if (id) {
          setVideoId(id);
          setIsVideo(true);
          setShowReader(true);
        }
      } else {
        setContentUrl(book.link);
        setIsVideo(false);
        setShowReader(true);
      }
    }
  };

  const recordDailyFreeRead = async () => {
    setHasUsedFreeRead(true);
    setCanReadToday(false);
  };

  const recordBookAccess = async () => {
    console.log('Book accessed:', book.id);
  };

  const handleDownload = () => {
    if (!user) {
      toast({
        title: 'Login necessário',
        description: 'Faça login para baixar livros.',
        variant: 'destructive',
      });
      return;
    }

    if (subscription.subscription_tier === 'premium' || subscription.subscription_tier === 'vitalício') {
      if (book.download) {
        window.open(book.download, '_blank');
      } else {
        toast({
          title: 'Download não disponível',
          description: 'Este livro não tem download disponível.',
          variant: 'destructive',
        });
      }
    } else {
      setShowPremiumModal(true);
    }
  };

  const closeReader = () => {
    setShowReader(false);
    setContentUrl(null);
    setVideoId(null);
    setIsVideo(false);
  };

  return {
    showReader,
    contentUrl,
    isVideo,
    videoId,
    showPremiumModal,
    setShowPremiumModal,
    showWaitModal,
    countdown,
    canReadToday,
    isReading,
    handleReadNow,
    toggleReading,
    handleDownload,
    closeReader
  };
};