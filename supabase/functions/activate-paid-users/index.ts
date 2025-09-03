import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header provided' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabase.auth.getUser(token);
    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('[ACTIVATE-PAID-USERS] Request from:', userData.user.id, userData.user.email);

    // Verify admin access
    const { data: isAdmin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', userData.user.id)
      .maybeSingle();

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let activatedCount = 0;
    const results = [];

    // 1. Find all users with paid payment_requests but no active subscription
    const { data: paidPayments, error: paidError } = await supabase
      .from('payment_requests')
      .select('user_id, payment_id, mp_payment_id, status, paid_at, created_at, source')
      .eq('status', 'paid');

    if (paidError) {
      console.error('[ACTIVATE-PAID-USERS] Error fetching payment_requests:', paidError);
    }

    console.log('[ACTIVATE-PAID-USERS] Found paid payment requests:', paidPayments?.length || 0);

    for (const payment of paidPayments || []) {
      try {
        // Check if user already has active subscription
        const { data: existingSub } = await supabase
          .from('user_subscriptions')
          .select('id, status')
          .eq('user_id', payment.user_id)
          .eq('status', 'active')
          .maybeSingle();

        if (existingSub) {
          console.log(`[ACTIVATE-PAID-USERS] User ${payment.user_id} already has active subscription`);
          continue;
        }

        // Create lifetime subscription
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 100);

        // Determine prefix based on source and payment ID
        const paymentId = payment.mp_payment_id || payment.payment_id;
        const isPixPayment = payment.source === 'pix' || paymentId?.startsWith('pix_');
        const prefix = isPixPayment ? 'pix_lifetime_' : 'mercado_pago_lifetime_';

        const { error: subscriptionError } = await supabase
          .from('user_subscriptions')
          .upsert({
            user_id: payment.user_id,
            plan_id: null,
            status: 'active',
            stripe_customer_id: prefix + paymentId,
            stripe_subscription_id: paymentId,
            current_period_end: futureDate.toISOString(),
            cancel_at_period_end: false
          }, {
            onConflict: 'user_id'
          });

        if (subscriptionError) {
          console.error(`[ACTIVATE-PAID-USERS] Error creating subscription for user ${payment.user_id}:`, subscriptionError);
          results.push({
            user_id: payment.user_id,
            payment_id: payment.payment_id,
            success: false,
            error: subscriptionError.message
          });
        } else {
          console.log(`[ACTIVATE-PAID-USERS] Activated lifetime subscription for user ${payment.user_id}`);
          activatedCount++;
          results.push({
            user_id: payment.user_id,
            payment_id: payment.payment_id,
            success: true
          });
        }
      } catch (error) {
        console.error(`[ACTIVATE-PAID-USERS] Error processing payment ${payment.payment_id}:`, error);
        results.push({
          user_id: payment.user_id,
          payment_id: payment.payment_id,
          success: false,
          error: error.message
        });
      }
    }

    // 2. Also check for any Mercado Pago payments that might not be in payment_requests
    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (accessToken) {
      console.log('[ACTIVATE-PAID-USERS] Also checking for orphaned Mercado Pago payments...');
      // This would require additional logic to check MP API directly
    }

    console.log(`[ACTIVATE-PAID-USERS] Activated ${activatedCount} users out of ${paidPayments?.length || 0} paid payments`);

    return new Response(JSON.stringify({
      success: true,
      message: `Activated ${activatedCount} users with lifetime access`,
      activatedCount,
      totalPaidPayments: paidPayments?.length || 0,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[ACTIVATE-PAID-USERS] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});