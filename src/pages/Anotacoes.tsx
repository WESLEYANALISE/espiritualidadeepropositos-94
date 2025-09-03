import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote, Plus, Trash2, Edit3 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useToast } from '@/hooks/use-toast';

interface BookNote {
  id: string;
  book_id: number;
  note_text: string;
  user_ip: string;
  created_at: string;
}

export default function Anotacoes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<BookNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  useEffect(() => {
    const fetchNotes = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('book_notes')
          .select('*')
          .eq('user_ip', 'user-' + user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setNotes(data || []);
      } catch (error) {
        console.error('Error fetching notes:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, [user]);

  const deleteNote = async (noteId: string) => {
    try {
      const { error } = await supabase
        .from('book_notes')
        .delete()
        .eq('id', noteId);

      if (error) throw error;

      setNotes(notes.filter(note => note.id !== noteId));
      toast({
        title: 'Anotação excluída',
        description: 'A anotação foi removida com sucesso.',
      });
    } catch (error) {
      console.error('Error deleting note:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a anotação.',
        variant: 'destructive',
      });
    }
  };

  const startEditing = (note: BookNote) => {
    setEditingNote(note.id);
    setEditText(note.note_text);
  };

  const saveEdit = async (noteId: string) => {
    try {
      const { data, error } = await supabase
        .from('book_notes')
        .update({ 
          note_text: editText
        })
        .eq('id', noteId)
        .select()
        .single();

      if (error) throw error;

      setNotes(notes.map(note => 
        note.id === noteId ? { ...note, note_text: editText } : note
      ));
      
      setEditingNote(null);
      setEditText('');
      
      toast({
        title: 'Anotação atualizada',
        description: 'Suas alterações foram salvas.',
      });
    } catch (error) {
      console.error('Error updating note:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar as alterações.',
        variant: 'destructive',
      });
    }
  };

  const cancelEdit = () => {
    setEditingNote(null);
    setEditText('');
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-6 pb-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center py-12">
            <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Faça login para ver suas anotações
            </h2>
            <p className="text-muted-foreground">
              Entre em sua conta para acessar suas anotações pessoais
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
            Minhas Anotações
          </h1>
          <p className="text-muted-foreground">
            Suas anotações pessoais sobre os livros
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-16 bg-muted rounded w-full"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12">
            <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Nenhuma anotação encontrada
            </h2>
            <p className="text-muted-foreground">
              Comece a fazer anotações durante suas leituras
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notes.map((note) => (
              <Card key={note.id} className="bg-gradient-card border-primary/20">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <StickyNote className="h-5 w-5 text-primary" />
                      Livro ID: {note.book_id}
                    </CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(note)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteNote(note.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  {editingNote === note.id ? (
                    <div className="space-y-3">
                      <Textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="min-h-[100px]"
                        placeholder="Digite sua anotação..."
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => saveEdit(note.id)}
                          className="bg-gradient-primary"
                        >
                          Salvar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEdit}
                        >
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p className="text-foreground leading-relaxed mb-3">
                        {note.note_text}
                      </p>
                      <div className="text-xs text-muted-foreground">
                        <span>Criado em: {new Date(note.created_at).toLocaleDateString('pt-BR')}</span>
                      </div>
                    </>
                  )}
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