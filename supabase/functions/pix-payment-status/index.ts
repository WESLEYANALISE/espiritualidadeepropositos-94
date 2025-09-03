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
  console.log(`[${timestamp}] [PIX-STATUS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id, user_id } = await req.json();
    logStep('Payment status check requested', { payment_id, user_id });

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let paymentToCheck = payment_id;

    // Se não temos payment_id, buscar pelo user_id
    if (!paymentToCheck && user_id) {
      logStep('Searching for latest payment by user_id');
      
      const { data: paymentRequest } = await supabaseService
        .from('payment_requests')
        .select('*')
        .eq('user_id', user_id)
        .in('source', ['pix_direct', 'mercado_pago_pix'])
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (paymentRequest?.mp_payment_id) {
        paymentToCheck = paymentRequest.mp_payment_id;
        logStep('Found payment to check', { payment_id: paymentToCheck });
      }
    }

    if (!paymentToCheck) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Nenhum pagamento encontrado para verificar' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Consultar status do pagamento no Mercado Pago
    logStep('Fetching payment status from Mercado Pago', { payment_id: paymentToCheck });
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentToCheck}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const paymentData = await response.json();
    
    if (!response.ok) {
      logStep('ERROR: Mercado Pago API error', paymentData);
      throw new Error(paymentData.message || 'Erro ao consultar pagamento');
    }

    logStep('Payment data retrieved', { 
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      external_reference: paymentData.external_reference
    });

    // Status PIX: pending, approved, cancelled, rejected, etc.
    const isApproved = paymentData.status === 'approved';
    let userPlan = 'free';

    if (isApproved) {
      // Extrair user_id
      const targetUserId = user_id || paymentData.external_reference || paymentData.metadata?.user_id;
      
      if (!targetUserId) {
        logStep('ERROR: No user ID available for processing');
        throw new Error('ID do usuário não encontrado para processar pagamento');
      }

      // Verificar se já processamos este pagamento (idempotência)
      const { data: existingPayment } = await supabaseService
        .from('payment_requests')
        .select('*')
        .eq('mp_payment_id', paymentToCheck)
        .eq('status', 'paid')
        .single();

      if (!existingPayment) {
        logStep('Processing approved payment');

        // Atualizar payment_requests
        const { error: paymentError } = await supabaseService
          .from('payment_requests')
          .upsert({
            user_id: targetUserId,
            payment_id: paymentToCheck,
            mp_payment_id: paymentToCheck,
            amount: paymentData.transaction_amount,
            currency: paymentData.currency_id || 'BRL',
            source: 'pix_direct',
            status: 'paid',
            raw: paymentData,
            paid_at: new Date().toISOString()
          }, {
            onConflict: 'mp_payment_id'
          });

        if (paymentError) {
          logStep('ERROR: Failed to update payment_requests', { error: paymentError });
        }

        // Ativar assinatura lifetime
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 100);

        // Buscar Premium plan_id
        const { data: planData } = await supabaseService
          .from('subscription_plans')
          .select('id')
          .eq('name', 'Premium')
          .single();

        const { error: subscriptionError } = await supabaseService
          .from('user_subscriptions')
          .upsert({
            user_id: targetUserId,
            plan_id: planData?.id || null,
            status: 'active',
            stripe_customer_id: 'pix_lifetime_' + paymentToCheck,
            stripe_subscription_id: paymentToCheck,
            current_period_end: futureDate.toISOString(),
            cancel_at_period_end: false
          }, {
            onConflict: 'user_id'
          });

        if (!subscriptionError) {
          userPlan = 'lifetime';
          logStep('Lifetime subscription activated');
        } else {
          logStep('ERROR: Failed to activate subscription', { error: subscriptionError });
        }
      } else {
        userPlan = 'lifetime';
        logStep('Payment already processed, subscription active');
      }
    }

    const result = {
      success: true,
      payment_id: paymentToCheck,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      isPaid: isApproved,
      plan: userPlan,
      transaction_amount: paymentData.transaction_amount,
      currency_id: paymentData.currency_id,
      date_approved: paymentData.date_approved,
      date_created: paymentData.date_created,
      date_last_updated: paymentData.date_last_updated
    };

    logStep('Payment status check completed', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    logStep('ERROR in payment status check', { 
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