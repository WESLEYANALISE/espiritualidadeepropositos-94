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
  console.log(`[${timestamp}] [PIX-CREATE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep('PIX payment creation started');
    
    const { payer, transactionAmount, description, externalReference } = await req.json();
    
    // Validar dados obrigatórios
    if (!payer?.email || !payer?.first_name || !payer?.identification?.number || !transactionAmount) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    // Get authenticated user
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
      logStep('Authenticated user', { userId });
    }

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    // Criar pagamento PIX conforme documentação oficial
    // https://www.mercadopago.com.br/developers/pt/docs/checkout-api/integration-configuration/integrate-with-pix
    const paymentData = {
      transaction_amount: transactionAmount,
      description: description || 'Licença Vitalícia - Acesso Total',
      payment_method_id: 'pix',
      external_reference: externalReference || userId,
      notification_url: `https://phzcazcyjhlmdchcjagy.supabase.co/functions/v1/pix-webhook`,
      metadata: {
        user_id: userId,
        plan: 'lifetime',
        source: 'pix_direct'
      },
      payer: {
        email: payer.email,
        first_name: payer.first_name,
        last_name: payer.last_name || payer.first_name,
        identification: {
          type: payer.identification.type || 'CPF',
          number: payer.identification.number
        }
      }
    };

    logStep('Creating payment with Mercado Pago', { amount: transactionAmount, email: payer.email });

    const response = await fetch('https://api.mercadopago.com/v1/payments', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Idempotency-Key': crypto.randomUUID()
      },
      body: JSON.stringify(paymentData)
    });

    const responseData = await response.json();
    logStep('Mercado Pago response received', { 
      status: response.status, 
      payment_id: responseData.id,
      payment_status: responseData.status 
    });

    if (!response.ok) {
      console.error('Mercado Pago API error:', responseData);
      throw new Error(responseData.message || 'Erro ao criar pagamento PIX');
    }

    // Extrair informações do PIX
    const pixInfo = responseData.point_of_interaction?.transaction_data;
    
    if (!pixInfo) {
      logStep('ERROR: PIX info not found in response');
      throw new Error('Informações do PIX não encontradas na resposta');
    }

    // Salvar requisição de pagamento no banco
    if (userId) {
      const supabaseService = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      const { error: insertError } = await supabaseService
        .from('payment_requests')
        .insert({
          user_id: userId,
          payment_id: responseData.id,
          mp_payment_id: responseData.id,
          amount: transactionAmount,
          currency: 'BRL',
          source: 'pix_direct',
          status: 'pending',
          raw: responseData
        });

      if (insertError) {
        logStep('ERROR: Failed to save payment request', { error: insertError });
      } else {
        logStep('Payment request saved successfully', { payment_id: responseData.id });
      }
    }

    const result = {
      success: true,
      payment_id: responseData.id,
      status: responseData.status,
      qr_code: pixInfo.qr_code,
      qr_code_base64: pixInfo.qr_code_base64,
      ticket_url: pixInfo.ticket_url,
      expires_at: responseData.date_of_expiration,
      amount: responseData.transaction_amount,
      currency: responseData.currency_id
    };

    logStep('PIX payment created successfully', result);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    logStep('ERROR in PIX payment creation', { 
      message: error.message,
      stack: error.stack?.split('\n').slice(0, 3)
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