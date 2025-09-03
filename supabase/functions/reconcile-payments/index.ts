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

    console.log('[RECONCILE-PAYMENTS] Request from:', userData.user.id, userData.user.email);

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

    const results = {
      processed: 0,
      activated: 0,
      alreadyActive: 0,
      errors: [],
      details: []
    };

    // Get pending payment requests
    const { data: pendingPayments, error: pendingError } = await supabase
      .from('payment_requests')
      .select('id, user_id, payment_id, mp_payment_id, status, source, created_at')
      .eq('status', 'pending')
      .limit(20); // Safe batch size

    if (pendingError) {
      console.error('[RECONCILE-PAYMENTS] Error fetching pending payments:', pendingError);
      results.errors.push(`Error fetching pending payments: ${pendingError.message}`);
    }

    const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
    if (!accessToken && (pendingPayments?.length || 0) > 0) {
      results.errors.push('MERCADO_PAGO_ACCESS_TOKEN not configured');
      return new Response(JSON.stringify(results), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`[RECONCILE-PAYMENTS] Found ${pendingPayments?.length || 0} pending payments`);

    for (const payment of pendingPayments || []) {
      results.processed++;
      
      try {
        // Check if user already has active subscription
        const { data: existingSub } = await supabase
          .from('user_subscriptions')
          .select('id, status, stripe_customer_id')
          .eq('user_id', payment.user_id)
          .eq('status', 'active')
          .maybeSingle();

        if (existingSub) {
          console.log(`[RECONCILE-PAYMENTS] User ${payment.user_id} already has active subscription`);
          results.alreadyActive++;
          results.details.push({
            payment_id: payment.mp_payment_id || payment.payment_id,
            user_id: payment.user_id,
            status: 'already_active',
            subscription_id: existingSub.stripe_customer_id
          });
          continue;
        }

        // Determine which payment ID to check
        const paymentIdToCheck = payment.mp_payment_id || payment.payment_id;
        if (!paymentIdToCheck) {
          results.errors.push(`Payment ${payment.id} has no valid payment ID`);
          continue;
        }

        // Check Mercado Pago status
        let mpStatus = null;
        try {
          const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentIdToCheck}`, {
            method: 'GET',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            }
          });

          if (mpResponse.ok) {
            const mpData = await mpResponse.json();
            mpStatus = mpData.status;
            console.log(`[RECONCILE-PAYMENTS] Payment ${paymentIdToCheck} status: ${mpStatus}`);

            if (mpStatus === 'approved') {
              // Update payment_requests to paid
              await supabase
                .from('payment_requests')
                .update({
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                  webhook_data: mpData,
                  updated_at: new Date().toISOString()
                })
                .eq('id', payment.id);

              // Create lifetime subscription
              const futureDate = new Date();
              futureDate.setFullYear(futureDate.getFullYear() + 100);

              // Determine prefix based on source
              const isPixPayment = payment.source === 'pix' || paymentIdToCheck.startsWith('pix_');
              const prefix = isPixPayment ? 'pix_lifetime_' : 'mercado_pago_lifetime_';
              
              const { error: subscriptionError } = await supabase
                .from('user_subscriptions')
                .upsert({
                  user_id: payment.user_id,
                  plan_id: null,
                  status: 'active',
                  stripe_customer_id: prefix + paymentIdToCheck,
                  stripe_subscription_id: paymentIdToCheck,
                  current_period_end: futureDate.toISOString(),
                  cancel_at_period_end: false
                }, {
                  onConflict: 'user_id'
                });

              if (subscriptionError) {
                console.error(`[RECONCILE-PAYMENTS] Error creating subscription for user ${payment.user_id}:`, subscriptionError);
                results.errors.push(`Subscription error for ${paymentIdToCheck}: ${subscriptionError.message}`);
              } else {
                console.log(`[RECONCILE-PAYMENTS] Activated lifetime subscription for user ${payment.user_id}`);
                results.activated++;
                results.details.push({
                  payment_id: paymentIdToCheck,
                  user_id: payment.user_id,
                  status: 'activated',
                  subscription_id: prefix + paymentIdToCheck
                });
              }
            } else {
              results.details.push({
                payment_id: paymentIdToCheck,
                user_id: payment.user_id,
                status: `mp_status_${mpStatus}`,
                note: 'Payment not approved yet'
              });
            }
          } else {
            console.error(`[RECONCILE-PAYMENTS] MP API error for ${paymentIdToCheck}:`, mpResponse.status);
            results.errors.push(`MP API error for ${paymentIdToCheck}: ${mpResponse.status}`);
          }
        } catch (mpError) {
          console.error(`[RECONCILE-PAYMENTS] MP API call failed for ${paymentIdToCheck}:`, mpError);
          results.errors.push(`MP API call failed for ${paymentIdToCheck}: ${mpError.message}`);
        }

      } catch (error) {
        console.error(`[RECONCILE-PAYMENTS] Error processing payment ${payment.id}:`, error);
        results.errors.push(`Processing error for payment ${payment.id}: ${error.message}`);
      }
    }

    console.log(`[RECONCILE-PAYMENTS] Summary: processed ${results.processed}, activated ${results.activated}, already active ${results.alreadyActive}, errors ${results.errors.length}`);

    return new Response(JSON.stringify({
      success: true,
      message: `Reconciliation complete. Activated ${results.activated} accounts out of ${results.processed} processed.`,
      ...results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('[RECONCILE-PAYMENTS] Error:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});