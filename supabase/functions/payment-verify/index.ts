import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYMENT-VERIFY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id, user_id } = await req.json();
    logStep('Payment verification requested', { payment_id, user_id });

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Mercado Pago access token not configured');
    }

    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let paymentToVerify = payment_id;

    // Se não temos payment_id, buscar pelo user_id
    if (!paymentToVerify && user_id) {
      logStep('Searching for latest payment by user_id');
      
      const { data: paymentRequest } = await supabaseService
        .from('payment_requests')
        .select('*')
        .eq('user_id', user_id)
        .eq('source', 'mercado_pago_pix')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (paymentRequest?.mp_payment_id) {
        paymentToVerify = paymentRequest.mp_payment_id;
        logStep('Found payment to verify', { payment_id: paymentToVerify });
      }
    }

    if (!paymentToVerify) {
      return new Response(JSON.stringify({ 
        error: 'No payment found to verify' 
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Consultar status do pagamento no Mercado Pago
    logStep('Fetching payment status from Mercado Pago', { payment_id: paymentToVerify });
    
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentToVerify}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const paymentData = await response.json();
    
    if (!response.ok) {
      logStep('ERROR: Mercado Pago API error', paymentData);
      throw new Error(paymentData.message || 'Error fetching payment data');
    }

    logStep('Payment data retrieved', { 
      status: paymentData.status,
      external_reference: paymentData.external_reference
    });

    const isApproved = ['approved', 'accredited'].includes(paymentData.status);
    let currentUserPlan = 'free';

    if (isApproved) {
      // Extrair user_id
      let targetUserId = user_id || paymentData.external_reference || paymentData.metadata?.user_id;
      
      if (!targetUserId) {
        throw new Error('No user ID available for processing');
      }

      // Verificar se já processamos este pagamento (idempotência)
      const { data: existingPayment } = await supabaseService
        .from('payment_requests')
        .select('*')
        .eq('mp_payment_id', paymentToVerify)
        .eq('status', 'paid')
        .single();

      if (!existingPayment) {
        logStep('Processing approved payment');

        // Atualizar payment_requests
        const { error: paymentError } = await supabaseService
          .from('payment_requests')
          .upsert({
            user_id: targetUserId,
            payment_id: paymentToVerify,
            mp_payment_id: paymentToVerify,
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
            stripe_customer_id: 'mercado_pago_lifetime_' + paymentToVerify,
            stripe_subscription_id: paymentToVerify,
            current_period_end: futureDate.toISOString(),
            cancel_at_period_end: false
          }, {
            onConflict: 'user_id'
          });

        if (!subscriptionError) {
          currentUserPlan = 'lifetime';
          logStep('Lifetime subscription activated');
        }
      } else {
        currentUserPlan = 'lifetime';
        logStep('Payment already processed, subscription active');
      }

      // Verificar status atual da assinatura
      if (user_id || targetUserId) {
        const { data: subscription } = await supabaseService
          .from('user_subscriptions')
          .select('*')
          .eq('user_id', user_id || targetUserId)
          .eq('status', 'active')
          .single();

        if (subscription) {
          const customerId = subscription.stripe_customer_id || '';
          if (customerId.includes('mercado_pago')) {
            currentUserPlan = 'lifetime';
          }
        }
      }
    }

    return new Response(JSON.stringify({
      payment_id: paymentToVerify,
      status: paymentData.status,
      isPaid: isApproved,
      plan: currentUserPlan,
      transaction_amount: paymentData.transaction_amount,
      date_approved: paymentData.date_approved
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    logStep('ERROR in payment-verify', { 
      message: error.message 
    });
    
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});