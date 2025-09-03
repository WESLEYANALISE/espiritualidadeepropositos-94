import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[${timestamp}] [RESTORE-ACCESS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id } = await req.json();
    logStep('Restore access requested', { user_id });

    if (!user_id) {
      throw new Error('ID do usuário é obrigatório');
    }

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se o usuário tem pagamentos aprovados
    const { data: paidPayments } = await supabaseService
      .from('payment_requests')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'paid')
      .in('source', ['mercado_pago_pix', 'pix_direct'])
      .order('created_at', { ascending: false });

    if (!paidPayments || paidPayments.length === 0) {
      logStep('No paid payments found for user');
      return new Response(JSON.stringify({
        success: false,
        error: 'Nenhum pagamento aprovado encontrado para este usuário'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404
      });
    }

    logStep('Found paid payments', { count: paidPayments.length });

    // Verificar se já tem assinatura ativa
    const { data: existingSubscription } = await supabaseService
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user_id)
      .eq('status', 'active')
      .single();

    if (existingSubscription) {
      logStep('User already has active subscription');
      return new Response(JSON.stringify({
        success: true,
        message: 'Usuário já possui assinatura ativa',
        subscription: existingSubscription
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Buscar Premium plan_id
    const { data: planData } = await supabaseService
      .from('subscription_plans')
      .select('id')
      .eq('name', 'Premium')
      .single();

    // Criar assinatura vitalícia baseada no pagamento mais recente
    const latestPayment = paidPayments[0];
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 100);

    const { error: subscriptionError } = await supabaseService
      .from('user_subscriptions')
      .insert({
        user_id: user_id,
        plan_id: planData?.id || null,
        status: 'active',
        stripe_customer_id: `restored_lifetime_${latestPayment.mp_payment_id}`,
        stripe_subscription_id: latestPayment.mp_payment_id,
        current_period_end: futureDate.toISOString(),
        cancel_at_period_end: false
      });

    if (subscriptionError) {
      logStep('ERROR: Failed to create subscription', { error: subscriptionError });
      throw new Error(`Falha ao restaurar assinatura: ${subscriptionError.message}`);
    }

    logStep('Subscription restored successfully', { 
      user_id,
      payment_id: latestPayment.mp_payment_id 
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Acesso vitalício restaurado com sucesso',
      payment_info: {
        payment_id: latestPayment.mp_payment_id,
        amount: latestPayment.amount,
        paid_at: latestPayment.paid_at
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    logStep('ERROR in restore access', { 
      message: error.message 
    });
    
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message || 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});