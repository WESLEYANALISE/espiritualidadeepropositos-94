import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface PaidUser {
  user_id: string;
  email: string | null;
  name: string | null;
  status: string;
  lifetime: boolean;
  source: string;
  current_period_end: string | null;
  payment_id: string | null;
  last_event_at: string | null;
}

export default function AdminPagos() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<PaidUser[]>([]);
  const [activating, setActivating] = useState(false);
  const [reconciling, setReconciling] = useState(false);

  const activateAll = async () => {
    setActivating(true);
    try {
      const { data, error } = await supabase.functions.invoke('activate-paid-users');
      if (error) throw error;
      
      toast({
        title: '✅ Ativação concluída',
        description: `${data.activatedCount} usuários ativados com acesso vitalício`,
      });
      
      // Recarregar lista
      await load();
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Erro na ativação',
        description: e?.message || 'Não foi possível ativar usuários',
        variant: 'destructive'
      });
    } finally {
      setActivating(false);
    }
  };

  const reconcilePayments = async () => {
    setReconciling(true);
    try {
      const { data, error } = await supabase.functions.invoke('reconcile-payments');
      if (error) throw error;
      
      toast({
        title: '✅ Reconciliação concluída',
        description: `${data.activated} contas ativadas de ${data.processed} processadas`,
      });
      
      // Show details if there are errors
      if (data.errors && data.errors.length > 0) {
        console.warn('Reconciliation errors:', data.errors);
        toast({
          title: '⚠️ Alguns erros encontrados',
          description: `${data.errors.length} erros durante a reconciliação. Verifique o console.`,
          variant: 'destructive'
        });
      }
      
      // Recarregar lista
      await load();
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Erro na reconciliação',
        description: e?.message || 'Não foi possível reconciliar pagamentos',
        variant: 'destructive'
      });
    } finally {
      setReconciling(false);
    }
  };

  const load = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('list-paid-users');
      if (error) throw error;
      setUsers(data?.users || []);
      document.title = 'Usuários Pagos - Admin';
    } catch (e: any) {
      console.error(e);
      toast({
        title: 'Erro ao carregar',
        description: e?.message || 'Não foi possível listar usuários pagos',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <main className="container mx-auto p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Usuários que já pagaram</h1>
        <div className="space-x-2">
          <Button onClick={reconcilePayments} disabled={reconciling} variant="secondary">
            {reconciling ? 'Reconciliando...' : 'Reconciliar Pendentes'}
          </Button>
          <Button onClick={activateAll} disabled={activating} variant="default">
            {activating ? 'Ativando...' : 'Ativar Todos'}
          </Button>
          <Button onClick={load} disabled={loading} variant="outline">
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </div>
      </header>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b">
                  <th className="p-3">Email</th>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Vitalício</th>
                  <th className="p-3">Fonte</th>
                  <th className="p-3">Fim do período</th>
                  <th className="p-3">Pago em</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.user_id} className="border-b hover:bg-muted/30">
                    <td className="p-3">{u.email || '—'}</td>
                    <td className="p-3">{u.name || '—'}</td>
                    <td className="p-3">{u.status}</td>
                    <td className="p-3">{u.lifetime ? 'Sim' : 'Não'}</td>
                    <td className="p-3">{u.source}</td>
                    <td className="p-3">{u.current_period_end ? new Date(u.current_period_end).toLocaleString('pt-BR') : '—'}</td>
                    <td className="p-3">{u.last_event_at ? new Date(u.last_event_at).toLocaleString('pt-BR') : '—'}</td>
                  </tr>
                ))}
                {users.length === 0 && !loading && (
                  <tr>
                    <td className="p-4 text-center text-muted-foreground" colSpan={7}>Nenhum usuário pago encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
