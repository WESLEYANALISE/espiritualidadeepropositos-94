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
    const { nome, email, cpf, amount, description } = await req.json();

    console.log('Creating Mercado Pago PIX payment:', { nome, email, amount, description });

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
      console.log('Authenticated user:', userId);
    }

    // Validar dados obrigatórios
    if (!nome || !email || !cpf || !amount || !description) {
      throw new Error('Dados obrigatórios não fornecidos');
    }

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken) {
      throw new Error('Token do Mercado Pago não configurado');
    }

    // Separar nome e sobrenome
    const nameParts = nome.trim().split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || firstName;

    // Criar pagamento PIX via Mercado Pago
    // Documentação: https://www.mercadopago.com.br/developers/pt/docs/checkout-transparent/payments-api/receive-payments
    const paymentData = {
      transaction_amount: amount,
      description: description,
      payment_method_id: 'pix',
      external_reference: userId, // Para rastreamento do user_id
      notification_url: `https://phzcazcyjhlmdchcjagy.supabase.co/functions/v1/mercado-pago-webhook`,
      metadata: {
        user_id: userId,
        plan: 'lifetime'
      },
      payer: {
        email: email,
        first_name: firstName,
        last_name: lastName,
        identification: {
          type: 'CPF',
          number: cpf.replace(/\D/g, '') // Remove formatação do CPF
        }
      }
    };

    console.log('Payment data:', paymentData);

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
    console.log('Mercado Pago response:', responseData);

    if (!response.ok) {
      console.error('Mercado Pago API error:', responseData);
      throw new Error(responseData.message || 'Erro ao criar pagamento');
    }

    // Extrair informações do PIX
    const pixInfo = responseData.point_of_interaction?.transaction_data;
    
    if (!pixInfo) {
      console.error('PIX info not found in response:', responseData);
      throw new Error('Informações do PIX não encontradas na resposta');
    }

    // Save payment request if user is authenticated
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
          amount: amount,
          currency: 'BRL',
          source: 'mercado_pago_pix',
          status: 'pending',
          raw: responseData
        });

      if (insertError) {
        console.error('Error saving payment request:', insertError);
        // Don't fail the request, just log the error
      } else {
        console.log('Payment request saved:', responseData.id);
      }
    }

    return new Response(JSON.stringify({
      payment_id: responseData.id,
      qr_code: pixInfo.qr_code,
      qr_code_base64: pixInfo.qr_code_base64,
      expires_at: responseData.date_of_expiration,
      status: responseData.status
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating Mercado Pago payment:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});