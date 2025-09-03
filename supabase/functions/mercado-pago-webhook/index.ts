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
  console.log(`[${timestamp}] [MP-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('Mercado Pago webhook received');
    
    const payload = await req.json();
    logStep('Payload received', { 
      type: payload.type,
      action: payload.action,
      data_id: payload.data?.id 
    });

    // Verificar se é uma notificação de pagamento
    if (payload.type !== 'payment') {
      logStep('Ignoring non-payment notification', { type: payload.type });
      return new Response('OK', { status: 200 });
    }

    const paymentId = payload.data?.id;
    if (!paymentId) {
      logStep('ERROR: No payment ID in webhook');
      throw new Error('No payment ID provided');
    }

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Mercado Pago access token not configured');
    }

    // Consultar status real do pagamento na API do Mercado Pago
    logStep('Fetching payment status from Mercado Pago', { payment_id: paymentId });
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const paymentData = await response.json();
    logStep('Payment data received', { 
      status: paymentData.status,
      external_reference: paymentData.external_reference 
    });

    if (!response.ok) {
      console.error('Mercado Pago API error:', paymentData);
      throw new Error(paymentData.message || 'Error fetching payment data');
    }

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se já processamos este pagamento (idempotência)
    const { data: existingPayment } = await supabaseService
      .from('payment_requests')
      .select('*')
      .eq('mp_payment_id', paymentId)
      .eq('status', 'paid')
      .single();

    if (existingPayment) {
      logStep('Payment already processed', { payment_id: paymentId });
      return new Response('Payment already processed', { status: 200 });
    }

    // Processar apenas pagamentos aprovados
    const isApproved = ['approved', 'accredited'].includes(paymentData.status);
    
    if (isApproved) {
      logStep('Processing approved payment');
      
      // Extrair user_id do external_reference ou metadata
      let userId = paymentData.external_reference;
      if (!userId && paymentData.metadata?.user_id) {
        userId = paymentData.metadata.user_id;
      }

      if (!userId) {
        logStep('ERROR: No user ID found in payment data');
        throw new Error('No user ID found in payment');
      }

      // Atualizar payment_requests
      const { error: paymentError } = await supabaseService
        .from('payment_requests')
        .upsert({
          user_id: userId,
          payment_id: paymentId,
          mp_payment_id: paymentId,
          amount: paymentData.transaction_amount,
          currency: paymentData.currency_id || 'BRL',
          source: 'mercado_pago_pix',
          status: 'paid',
          raw: paymentData,
          paid_at: new Date().toISOString()
        }, {
          onConflict: 'mp_payment_id'
        });

      if (paymentError) {
        logStep('ERROR: Failed to update payment_requests', { error: paymentError });
        throw new Error(`Failed to update payment: ${paymentError.message}`);
      }

      // Ativar assinatura lifetime
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 100); // 100 anos

      // Buscar Premium plan_id
      const { data: planData } = await supabaseService
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Premium')
        .single();

      const { error: subscriptionError } = await supabaseService
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planData?.id || null,
          status: 'active',
          stripe_customer_id: 'mercado_pago_lifetime_' + paymentId,
          stripe_subscription_id: paymentId,
          current_period_end: futureDate.toISOString(),
          cancel_at_period_end: false
        }, {
          onConflict: 'user_id'
        });

      if (subscriptionError) {
        logStep('ERROR: Failed to activate subscription', { error: subscriptionError });
        throw new Error(`Failed to activate subscription: ${subscriptionError.message}`);
      }

      logStep('Lifetime subscription activated', { 
        user_id: userId,
        payment_id: paymentId
      });
    } else {
      logStep('Payment not approved, updating status only', { 
        status: paymentData.status 
      });

      // Atualizar apenas o status se não aprovado
      const userId = paymentData.external_reference || paymentData.metadata?.user_id;
      if (userId) {
        await supabaseService
          .from('payment_requests')
          .upsert({
            user_id: userId,
            payment_id: paymentId,
            mp_payment_id: paymentId,
            amount: paymentData.transaction_amount,
            currency: paymentData.currency_id || 'BRL',
            source: 'mercado_pago_pix',
            status: paymentData.status,
            raw: paymentData
          }, {
            onConflict: 'mp_payment_id'
          });
      }
    }

    return new Response('Webhook processed successfully', {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    logStep('ERROR in mercado-pago-webhook', { 
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
    });
    
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      details: error.message
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});