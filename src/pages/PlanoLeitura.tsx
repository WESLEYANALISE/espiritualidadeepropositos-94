import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Plus, Target, CheckCircle, Clock, Star, Trash2, Edit, Calendar, ArrowUp, ArrowDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { BottomNavigation } from '@/components/BottomNavigation';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CompactBookSearch } from '@/components/CompactBookSearch';
import { useSubscriptionLimits } from '@/hooks/useSubscriptionLimits';

interface ReadingPlan {
  id: string;
  book_title: string;
  book_author: string;
  status: 'planejado' | 'lendo' | 'concluido' | 'pausado';
  priority: 'baixa' | 'media' | 'alta';
  notes: string;
  target_date: string | null;
  progress_percentage: number;
  created_at: string;
  updated_at: string;
  order: number;
}

export default function PlanoLeitura() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { checkReadingPlanLimit } = useSubscriptionLimits();
  const [readingPlans, setReadingPlans] = useState<ReadingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<ReadingPlan | null>(null);
  const [formData, setFormData] = useState<{
    book_title: string;
    book_author: string;
    status: 'planejado' | 'lendo' | 'concluido' | 'pausado';
    priority: 'baixa' | 'media' | 'alta';
    notes: string;
    target_date: string;
    progress_percentage: number;
  }>({
    book_title: '',
    book_author: '',
    status: 'planejado',
    priority: 'media',
    notes: '',
    target_date: '',
    progress_percentage: 0
  });

  useEffect(() => {
    fetchReadingPlans();
  }, [user]);

  const fetchReadingPlans = () => {
    if (!user) return;

    try {
      const savedPlans = localStorage.getItem(`reading_plans_${user.id}`);
      if (savedPlans) {
        const plans = JSON.parse(savedPlans);
        setReadingPlans(plans.sort((a: ReadingPlan, b: ReadingPlan) => a.order - b.order));
      }
    } catch (error) {
      console.error('Error fetching reading plans:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePlansToStorage = (plans: ReadingPlan[]) => {
    if (!user) return;
    localStorage.setItem(`reading_plans_${user.id}`, JSON.stringify(plans));
  };

  const handleSubmit = () => {
    if (!user || !formData.book_title) return;

    try {
      const now = new Date().toISOString();
      
      if (editingPlan) {
        const updatedPlans = readingPlans.map(plan => 
          plan.id === editingPlan.id 
            ? { 
                ...plan, 
                ...formData, 
                updated_at: now 
              }
            : plan
        );
        setReadingPlans(updatedPlans);
        savePlansToStorage(updatedPlans);

        toast({
          title: 'Plano atualizado',
          description: 'Seu plano de leitura foi atualizado com sucesso.',
        });
      } else {
        // Check limit before creating new plan
        if (!checkReadingPlanLimit()) {
          return;
        }
        
        const newPlan: ReadingPlan = {
          id: crypto.randomUUID(),
          ...formData,
          created_at: now,
          updated_at: now,
          order: readingPlans.length
        };
        
        const updatedPlans = [...readingPlans, newPlan];
        setReadingPlans(updatedPlans);
        savePlansToStorage(updatedPlans);

        toast({
          title: 'Plano adicionado',
          description: 'Novo livro adicionado ao seu plano de leitura.',
        });
      }

      setDialogOpen(false);
      setEditingPlan(null);
      resetForm();
    } catch (error) {
      console.error('Error saving reading plan:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar o plano de leitura.',
        variant: 'destructive',
      });
    }
  };

  const deletePlan = (planId: string) => {
    const updatedPlans = readingPlans.filter(plan => plan.id !== planId);
    setReadingPlans(updatedPlans);
    savePlansToStorage(updatedPlans);
    
    toast({
      title: 'Plano removido',
      description: 'O livro foi removido do seu plano de leitura.',
    });
  };

  const movePlan = (planId: string, direction: 'up' | 'down') => {
    const planIndex = readingPlans.findIndex(p => p.id === planId);
    if (planIndex === -1) return;
    
    const newIndex = direction === 'up' ? planIndex - 1 : planIndex + 1;
    if (newIndex < 0 || newIndex >= readingPlans.length) return;
    
    const updatedPlans = [...readingPlans];
    [updatedPlans[planIndex], updatedPlans[newIndex]] = [updatedPlans[newIndex], updatedPlans[planIndex]];
    
    // Update order values
    updatedPlans.forEach((plan, index) => {
      plan.order = index;
    });
    
    setReadingPlans(updatedPlans);
    savePlansToStorage(updatedPlans);
  };

  const resetForm = () => {
    setFormData({
      book_title: '',
      book_author: '',
      status: 'planejado',
      priority: 'media',
      notes: '',
      target_date: '',
      progress_percentage: 0
    });
  };

  const openEditDialog = (plan: ReadingPlan) => {
    setEditingPlan(plan);
    setFormData({
      book_title: plan.book_title,
      book_author: plan.book_author,
      status: plan.status,
      priority: plan.priority,
      notes: plan.notes,
      target_date: plan.target_date || '',
      progress_percentage: plan.progress_percentage
    });
    setDialogOpen(true);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planejado': return <Target className="h-4 w-4" />;
      case 'lendo': return <BookOpen className="h-4 w-4" />;
      case 'concluido': return <CheckCircle className="h-4 w-4" />;
      case 'pausado': return <Clock className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'planejado': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'lendo': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'concluido': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'pausado': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'media': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'baixa': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background pt-6 pb-20">
        <div className="container mx-auto max-w-4xl px-4">
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Faça login para acessar seu plano de leitura
            </h2>
            <p className="text-muted-foreground">
              Entre em sua conta para organizar seus livros e acompanhar seu progresso
            </p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-4 pb-20">
      <div className="container mx-auto max-w-4xl px-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
              📚 Plano de Leitura
            </h1>
            <p className="text-sm text-muted-foreground">
              Organize e acompanhe seu progresso
            </p>
          </div>
          
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-gradient-primary shadow-glow" onClick={() => {
                setEditingPlan(null);
                resetForm();
              }}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] bg-gradient-card border-primary/20">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  {editingPlan ? '✏️ Editar Plano' : '📖 Adicionar ao Plano de Leitura'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Buscar Livro *</label>
                  <CompactBookSearch
                    onBookSelect={(book) => {
                      setFormData(prev => ({
                        ...prev,
                        book_title: book.livro,
                        book_author: book.autor
                      }));
                    }}
                    placeholder="Digite o nome do livro para buscar..."
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Título *</label>
                    <Input
                      value={formData.book_title}
                      onChange={(e) => setFormData(prev => ({ ...prev, book_title: e.target.value }))}
                      placeholder="Título do livro"
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground">Autor</label>
                    <Input
                      value={formData.book_author}
                      onChange={(e) => setFormData(prev => ({ ...prev, book_author: e.target.value }))}
                      placeholder="Nome do autor"
                      className="border-primary/20 focus:border-primary"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground">Status</label>
                    <Select value={formData.status} onValueChange={(value: any) => setFormData(prev => ({ ...prev, status: value }))}>
                      <SelectTrigger className="border-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planejado">🎯 Planejado</SelectItem>
                        <SelectItem value="lendo">📖 Lendo</SelectItem>
                        <SelectItem value="concluido">✅ Concluído</SelectItem>
                        <SelectItem value="pausado">⏸️ Pausado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-foreground">Prioridade</label>
                    <Select value={formData.priority} onValueChange={(value: any) => setFormData(prev => ({ ...prev, priority: value }))}>
                      <SelectTrigger className="border-primary/20">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="baixa">🟢 Baixa</SelectItem>
                        <SelectItem value="media">🟡 Média</SelectItem>
                        <SelectItem value="alta">🔴 Alta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground">Data Objetivo</label>
                  <Input
                    type="date"
                    value={formData.target_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, target_date: e.target.value }))}
                    className="border-primary/20 focus:border-primary"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground">Progresso (%)</label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={formData.progress_percentage}
                    onChange={(e) => setFormData(prev => ({ ...prev, progress_percentage: parseInt(e.target.value) || 0 }))}
                    className="border-primary/20 focus:border-primary"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium text-foreground">Anotações</label>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Suas impressões, objetivos ou anotações sobre o livro"
                    rows={3}
                    className="border-primary/20 focus:border-primary"
                  />
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button 
                    onClick={handleSubmit}
                    disabled={!formData.book_title}
                    className="flex-1 bg-gradient-primary shadow-glow"
                  >
                    {editingPlan ? '💾 Atualizar' : '➕ Adicionar'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setDialogOpen(false);
                      setEditingPlan(null);
                      resetForm();
                    }}
                    className="border-primary/20"
                  >
                    ❌ Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Compact Statistics */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            { label: 'Total', count: readingPlans.length, emoji: '📚' },
            { label: 'Lendo', count: readingPlans.filter(p => p.status === 'lendo').length, emoji: '📖' },
            { label: 'Concluídos', count: readingPlans.filter(p => p.status === 'concluido').length, emoji: '✅' },
            { label: 'Planejados', count: readingPlans.filter(p => p.status === 'planejado').length, emoji: '🎯' }
          ].map((stat, index) => (
            <Card key={index} className="bg-gradient-card border-primary/20">
              <CardContent className="p-3 text-center">
                <div className="text-xl mb-1">{stat.emoji}</div>
                <div className="text-lg font-bold text-foreground">{stat.count}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </CardContent>
            </Card>
          ))}
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
        ) : readingPlans.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📚</div>
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Seu plano de leitura está vazio
            </h2>
            <p className="text-muted-foreground mb-4">
              Comece adicionando livros que deseja ler e organize sua jornada literária
            </p>
            <Button onClick={() => setDialogOpen(true)} className="bg-gradient-primary shadow-glow">
              <Plus className="h-4 w-4 mr-2" />
              🚀 Adicionar Primeiro Livro
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {readingPlans.map((plan, index) => (
              <Card key={plan.id} className="bg-gradient-card border-primary/20 hover:shadow-luxury transition-all duration-300 group">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 text-foreground text-lg">
                        {getStatusIcon(plan.status)}
                        {plan.book_title}
                      </CardTitle>
                      {plan.book_author && (
                        <p className="text-muted-foreground mt-1">✍️ por {plan.book_author}</p>
                      )}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => movePlan(plan.id, 'up')}
                        disabled={index === 0}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => movePlan(plan.id, 'down')}
                        disabled={index === readingPlans.length - 1}
                        className="h-8 w-8 p-0"
                      >
                        <ArrowDown className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEditDialog(plan)}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePlan(plan.id)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex flex-wrap gap-2 mb-3">
                    <Badge className={getStatusColor(plan.status)}>
                      {plan.status.charAt(0).toUpperCase() + plan.status.slice(1)}
                    </Badge>
                    <Badge className={getPriorityColor(plan.priority)}>
                      Prioridade {plan.priority}
                    </Badge>
                    {plan.target_date && (
                      <Badge variant="outline" className="flex items-center gap-1 border-primary/20">
                        <Calendar className="h-3 w-3" />
                        {new Date(plan.target_date).toLocaleDateString('pt-BR')}
                      </Badge>
                    )}
                  </div>
                  
                  {plan.progress_percentage > 0 && (
                    <div className="mb-3">
                      <div className="flex justify-between text-sm mb-1 text-foreground">
                        <span>📊 Progresso</span>
                        <span className="font-medium">{plan.progress_percentage}%</span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div 
                          className="bg-gradient-primary h-full rounded-full transition-all duration-500 shadow-glow" 
                          style={{ width: `${plan.progress_percentage}%` }}
                        />
                      </div>
                    </div>
                  )}
                  
                  {plan.notes && (
                    <div className="mt-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <p className="text-sm text-foreground leading-relaxed">💭 {plan.notes}</p>
                    </div>
                  )}
                  
                  <div className="text-xs text-muted-foreground mt-3 flex items-center justify-between">
                    <span>📅 Adicionado em {new Date(plan.created_at).toLocaleDateString('pt-BR')}</span>
                    {plan.status === 'lendo' && (
                      <Badge variant="secondary" className="animate-pulse bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                        <BookOpen className="h-3 w-3 mr-1" />
                        Lendo agora
                      </Badge>
                    )}
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