import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id } = await req.json();

    console.log('Checking Mercado Pago payment status:', payment_id);

    if (!payment_id) {
      throw new Error('ID do pagamento não fornecido');
    }

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    let userId = null;
    
    if (authHeader) {
      const supabaseClient = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? ''
      );
      
      const token = authHeader.replace('Bearer ', '');
      const { data } = await supabaseClient.auth.getUser(token);
      userId = data.user?.id;
    }

    // Consultar status do pagamento
    // Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-transparent/payments-api/payment-status
    const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const paymentData = await response.json();
    console.log('Payment status response:', paymentData);

    if (!response.ok) {
      console.error('Mercado Pago API error:', paymentData);
      throw new Error(paymentData.message || 'Erro ao consultar pagamento');
    }

    // Status possíveis: pending, approved, authorized, in_process, in_mediation, rejected, cancelled, refunded, charged_back
    const isPaid = paymentData.status === 'approved';

    // Se o pagamento foi aprovado e temos um usuário, ativar licença vitalícia
    if (isPaid && userId) {
      const supabaseService = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      // Get the Premium plan_id
      const { data: planData } = await supabaseService
        .from('subscription_plans')
        .select('id')
        .eq('name', 'Premium')
        .single();

      if (!planData) {
        console.error('Premium plan not found');
      }

      // Create or update lifetime subscription
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 100); // 100 years from now

      console.log('Creating lifetime subscription for user:', userId);

      const { error: subscriptionError } = await supabaseService
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: planData?.id || null,
          status: 'active',
          stripe_customer_id: 'mercado_pago_lifetime_' + payment_id,
          stripe_subscription_id: payment_id,
          current_period_end: futureDate.toISOString(),
          cancel_at_period_end: false
        }, {
          onConflict: 'user_id'
        });

      if (subscriptionError) {
        console.error('Error saving subscription:', subscriptionError);
      } else {
        console.log('Lifetime subscription activated for user:', userId);
      }
    }

    return new Response(JSON.stringify({
      payment_id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
      isPaid: isPaid,
      transaction_amount: paymentData.transaction_amount,
      date_approved: paymentData.date_approved,
      date_created: paymentData.date_created
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error checking Mercado Pago payment:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});