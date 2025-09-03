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
    // Parse request body
    const body = await req.json().catch(() => ({}));
    const { forceLifetime, userId: bodyUserId } = body;

    // Create Supabase client with service role key
    const supabaseService = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get auth user from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header provided');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: userData, error: userError } = await supabaseService.auth.getUser(token);
    
    if (userError || !userData.user) {
      throw new Error('User not authenticated');
    }

    const userId = bodyUserId || userData.user.id;
    console.log('Refreshing subscription for user:', userId, userData.user.email);

    // If forceLifetime is requested, create/update lifetime subscription immediately
    if (forceLifetime) {
      console.log('Forcing lifetime subscription activation for user:', userId);
      
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 100);

      const { error: subscriptionError } = await supabaseService
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan_id: null,
          status: 'active',
          stripe_customer_id: 'manual_lifetime_' + Date.now(),
          stripe_subscription_id: 'manual_' + Date.now(),
          current_period_end: futureDate.toISOString(),
          cancel_at_period_end: false
        }, {
          onConflict: 'user_id'
        });

      if (subscriptionError) {
        console.error('Error creating lifetime subscription:', subscriptionError);
        throw new Error('Failed to activate lifetime subscription');
      }

      console.log('Lifetime subscription activated successfully!');

      return new Response(JSON.stringify({
        success: true,
        subscription: {
          subscribed: true,
          subscription_tier: 'vitalício',
          subscription_end: futureDate.toISOString()
        },
        user_email: userData.user.email,
        forced_lifetime: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Force refresh subscription data
    const { data: subscription, error: subError } = await supabaseService
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle();

    if (subError) {
      console.error('Error fetching subscription:', subError);
      throw new Error('Failed to fetch subscription data');
    }

    console.log('Current subscription data:', subscription);

    let isSubscribed = false;
    let subscriptionTier = null;
    let subscriptionEnd = null;

    if (subscription) {
      const customerId = subscription.stripe_customer_id || '';
      const isMercadoPago = customerId.includes('mercado_pago');
      const isManualLifetime = customerId.includes('manual_lifetime_');
      const isPixLifetime = customerId.includes('pix_lifetime_');
      const currentPeriodEnd = subscription.current_period_end;
      const isValidPeriod = !currentPeriodEnd || new Date(currentPeriodEnd) > new Date();

      if ((isMercadoPago || isManualLifetime || isPixLifetime) && isValidPeriod) {
        isSubscribed = true;
        subscriptionTier = 'vitalício';
        subscriptionEnd = currentPeriodEnd;
      }
    }

    // Check for pending payment requests and try to reconcile them
    if (!isSubscribed) {
      console.log('No active subscription found, checking pending payment requests...');
      
      const { data: pendingPayments, error: pendingError } = await supabaseService
        .from('payment_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (!pendingError && pendingPayments && pendingPayments.length > 0) {
        console.log('Found pending payment requests:', pendingPayments.length);
        
        // Check each pending payment with Mercado Pago
        for (const payment of pendingPayments) {
          try {
            console.log('Checking payment:', payment.payment_id);
            
            const accessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN');
            if (!accessToken) {
              console.log('Mercado Pago access token not configured, skipping...');
              continue;
            }

            const response = await fetch(`https://api.mercadopago.com/v1/payments/${payment.payment_id}`, {
              method: 'GET',
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            });

            const paymentData = await response.json();
            console.log('Mercado Pago payment check result:', { payment_id: payment.payment_id, status: paymentData.status });

            if (response.ok && paymentData.status === 'approved') {
              console.log('Mercado Pago payment approved! Activating subscription for payment:', payment.payment_id);
              
              // Update payment request status
              await supabaseService
                .from('payment_requests')
                .update({ 
                  status: 'paid',
                  paid_at: new Date().toISOString(),
                  raw: paymentData,
                  webhook_data: paymentData,
                  updated_at: new Date().toISOString()
                })
                .eq('id', payment.id);

              // Activate subscription
              const futureDate = new Date();
              futureDate.setFullYear(futureDate.getFullYear() + 100);

              await supabaseService
                .from('user_subscriptions')
                .upsert({
                  user_id: userId,
                  plan_id: null,
                  status: 'active',
                  stripe_customer_id: 'mercado_pago_lifetime_' + payment.payment_id,
                  stripe_subscription_id: payment.payment_id,
                  current_period_end: futureDate.toISOString(),
                  cancel_at_period_end: false
                }, {
                  onConflict: 'user_id'
                });

              // Update local variables
              isSubscribed = true;
              subscriptionTier = 'vitalício';
              subscriptionEnd = futureDate.toISOString();
              
              console.log('Subscription activated from pending Mercado Pago payment!');
              break; // Stop checking other payments
            }
          } catch (paymentCheckError) {
            console.error('Error checking payment:', payment.payment_id, paymentCheckError);
            // Continue to next payment
          }
        }
      }
    }
    // Backfill: if user has a PAID payment already, ensure lifetime is active
    if (!isSubscribed) {
      console.log('Checking paid payment requests to backfill subscription...');

      const { data: paidPayments, error: paidError } = await supabaseService
        .from('payment_requests')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(1);

      if (!paidError && paidPayments && paidPayments.length > 0) {
        const paid = paidPayments[0];
        const futureDate = new Date();
        futureDate.setFullYear(futureDate.getFullYear() + 100);

        const { error: upsertError } = await supabaseService
          .from('user_subscriptions')
          .upsert({
            user_id: userId,
            plan_id: null,
            status: 'active',
            stripe_customer_id: 'mercado_pago_lifetime_' + paid.payment_id,
            stripe_subscription_id: paid.payment_id,
            current_period_end: futureDate.toISOString(),
            cancel_at_period_end: false
          }, { onConflict: 'user_id' });

        if (!upsertError) {
          isSubscribed = true;
          subscriptionTier = 'vitalício';
          subscriptionEnd = futureDate.toISOString();
          console.log('Backfilled lifetime subscription from paid payment:', paid.payment_id);
        } else {
          console.error('Error backfilling subscription:', upsertError);
        }
      }
    }

    return new Response(JSON.stringify({
      success: true,
      subscription: {
        subscribed: isSubscribed,
        subscription_tier: subscriptionTier,
        subscription_end: subscriptionEnd
      },
      user_email: userData.user.email
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in refresh-subscription:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error',
      success: false
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});