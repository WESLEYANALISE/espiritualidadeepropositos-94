import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  subscriptionLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, fullName?: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  subscription: {
    subscribed: boolean;
    subscription_tier: string | null;
    subscription_end: string | null;
  };
  checkSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Inicializar com dados do localStorage se disponível
  const getInitialSubscription = () => {
    try {
      const saved = localStorage.getItem('subscription_status');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('📱 Carregando status salvo:', parsed);
        return parsed;
      }
    } catch (error) {
      console.error('❌ Erro ao carregar status salvo:', error);
    }
    return {
      subscribed: false,
      subscription_tier: null as string | null,
      subscription_end: null as string | null,
    };
  };
  
  const [subscription, setSubscription] = useState(getInitialSubscription());
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [isCheckingSubscription, setIsCheckingSubscription] = useState(false);

  const checkSubscription = async () => {
    if (!session || isCheckingSubscription) {
      setSubscriptionLoading(false);
      return;
    }
    
    setIsCheckingSubscription(true);
    setSubscriptionLoading(true);
    
    try {
      console.log('🔍 Verificando assinatura para usuário:', session.user.id, session.user.email);
      
      // First, try to refresh/reconcile subscription status
      console.log('🔄 Calling refresh-subscription function...');
      try {
        const { data: refreshData, error: refreshError } = await supabase.functions.invoke('refresh-subscription');
        if (refreshError) {
          console.warn('⚠️ Refresh subscription error (continuing with normal check):', refreshError);
        } else {
          console.log('✅ Refresh subscription result:', refreshData);
        }
      } catch (refreshErr) {
        console.warn('⚠️ Refresh subscription failed (continuing with normal check):', refreshErr);
      }
      
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();
      
      if (error) {
        console.error('❌ Erro ao verificar assinatura:', error);
        setSubscription({
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
        });
        return;
      }

      console.log('📊 Dados da assinatura do banco:', data);

      if (data) {
        // Verifica se é assinatura do Mercado Pago, manual ou PIX (licença vitalícia)
        const customerId = (data as any).stripe_customer_id || '';
        const isLifetimeSubscription = customerId.includes('mercado_pago') || 
                                     customerId.includes('manual_lifetime_') ||
                                     customerId.includes('pix_lifetime_') ||
                                     customerId.includes('lifetime') ||
                                     data.status === 'active'; // Aceita qualquer assinatura ativa
        
        // Verifica se o período da assinatura é válido
        const currentPeriodEnd = (data as any).current_period_end;
        const isValidPeriod = !currentPeriodEnd || new Date(currentPeriodEnd) > new Date();
        
        console.log('🏷️ Customer ID:', customerId);
        console.log('💳 É assinatura vitalícia:', isLifetimeSubscription);
        console.log('⏰ Período válido:', isValidPeriod);
        console.log('📅 Data fim:', currentPeriodEnd);
        console.log('🔍 Status da assinatura:', data.status);
        
        if (isLifetimeSubscription && isValidPeriod) {
          const newSubscriptionState = {
            subscribed: true,
            subscription_tier: 'vitalício',
            subscription_end: currentPeriodEnd,
          };
          console.log('✅ Assinatura vitalícia ativada!');
          console.log('🎯 Estado subscription definido como:', newSubscriptionState);
          
          // Salvar no localStorage para persistir mesmo após logout
          localStorage.setItem('subscription_status', JSON.stringify(newSubscriptionState));
          
          setSubscription(newSubscriptionState);
        } else {
          console.log('❌ Assinatura não válida ou expirada');
          // Só resetar se não tinha assinatura vitalícia salva
          const savedStatus = localStorage.getItem('subscription_status');
          if (savedStatus) {
            const parsed = JSON.parse(savedStatus);
            if (parsed.subscription_tier === 'vitalício') {
              console.log('💾 Mantendo status vitalício do localStorage');
              setSubscription(parsed);
              return;
            }
          }
          
          const newSubscriptionState = {
            subscribed: false,
            subscription_tier: null,
            subscription_end: null,
          };
          console.log('🎯 Estado subscription definido como:', newSubscriptionState);
          setSubscription(newSubscriptionState);
        }
      } else {
        console.log('❌ Nenhuma assinatura ativa encontrada');
        // Só resetar se não tinha assinatura vitalícia salva
        const savedStatus = localStorage.getItem('subscription_status');
        if (savedStatus) {
          const parsed = JSON.parse(savedStatus);
          if (parsed.subscription_tier === 'vitalício') {
            console.log('💾 Mantendo status vitalício do localStorage');
            setSubscription(parsed);
            return;
          }
        }
        
        const newSubscriptionState = {
          subscribed: false,
          subscription_tier: null,
          subscription_end: null,
        };
        console.log('🎯 Estado subscription definido como:', newSubscriptionState);
        setSubscription(newSubscriptionState);
      }
    } catch (error) {
      console.error('❌ Erro na verificação de assinatura:', error);
      // Em caso de erro, manter status vitalício se estava salvo
      const savedStatus = localStorage.getItem('subscription_status');
      if (savedStatus) {
        const parsed = JSON.parse(savedStatus);
        if (parsed.subscription_tier === 'vitalício') {
          console.log('💾 Mantendo status vitalício devido ao erro');
          setSubscription(parsed);
          return;
        }
      }
      
      setSubscription({
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
      });
    } finally {
      setSubscriptionLoading(false);
      setIsCheckingSubscription(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔐 Auth state changed:', event, session?.user?.email);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        if (session?.user) {
          console.log('🚀 Chamando checkSubscription para usuário:', session.user.email);
          // Remove setTimeout para executar imediatamente
          checkSubscription();
        } else {
          console.log('❌ Usuário deslogado - verificando status vitalício salvo');
          const savedStatus = localStorage.getItem('subscription_status');
          if (savedStatus) {
            const parsed = JSON.parse(savedStatus);
            if (parsed.subscription_tier === 'vitalício') {
              console.log('💾 Mantendo status vitalício após logout');
              setSubscription(parsed);
              setSubscriptionLoading(false);
              setIsCheckingSubscription(false);
              return;
            }
          }
          
          setSubscription({
            subscribed: false,
            subscription_tier: null,
            subscription_end: null,
          });
          setSubscriptionLoading(false);
          setIsCheckingSubscription(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔄 Sessão existente encontrada:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
      
      if (session?.user) {
        console.log('🚀 Chamando checkSubscription inicial para:', session.user.email);
        // Remove setTimeout para executar imediatamente
        checkSubscription();
      }
    });

    return () => authSubscription.unsubscribe();
  }, []);

  // Automatic and discrete subscription checking
  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    
    // Start automatic checking if user is logged in
    if (session?.user) {
      // Immediate check after login (discrete)
      setTimeout(() => {
        checkSubscription();
      }, 2000); // 2 segundos após login
      
      // If no active subscription, check more frequently for PIX payments
      if (!subscription.subscribed) {
        console.log('⏰ Iniciando checagem automática para pagamentos PIX');
        intervalId = setInterval(() => {
          checkSubscription();
        }, 5 * 60 * 1000); // 5 minutos para detectar pagamentos PIX rapidamente
      } else {
        // Even with active subscription, check occasionally for any changes
        intervalId = setInterval(() => {
          checkSubscription();
        }, 30 * 60 * 1000); // 30 minutos para usuários com assinatura
      }
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [session?.user?.id, subscription.subscribed]); // Trigger when user changes or subscription status changes

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName || '',
          }
        }
      });
      return { error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' });
      window.location.href = '/auth';
    } catch (error) {
      console.error('Error signing out:', error);
      window.location.href = '/auth';
    }
  };

  const value = {
    user,
    session,
    loading,
    subscriptionLoading,
    signIn,
    signUp,
    signOut,
    subscription,
    checkSubscription,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};