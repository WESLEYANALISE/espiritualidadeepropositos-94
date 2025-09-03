import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // CORS preflight
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

    const requesterId = userData.user.id;
    console.log('[LIST-PAID-USERS] Request from:', requesterId, userData.user.email);

    // Verify admin access
    const { data: isAdmin } = await supabase
      .from('admin_users')
      .select('id')
      .eq('id', requesterId)
      .maybeSingle();

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Forbidden: admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch users with active subscription
    const { data: subs, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('user_id, status, current_period_end, stripe_customer_id, created_at, updated_at')
      .eq('status', 'active');

    if (subsError) {
      console.error('[LIST-PAID-USERS] Error fetching subscriptions:', subsError);
    }

    // Fetch users with paid payment requests
    const { data: paidPayments, error: paidError } = await supabase
      .from('payment_requests')
      .select('user_id, payment_id, status, paid_at, created_at')
      .eq('status', 'paid');

    if (paidError) {
      console.error('[LIST-PAID-USERS] Error fetching payment_requests:', paidError);
    }

    const usersMap = new Map<string, any>();

    // Consolidate from subscriptions (prefer lifetime markers if present)
    for (const s of subs || []) {
      const mark = (s.stripe_customer_id || '').toString();
      const isLifetime = mark.includes('mercado_pago') || mark.includes('manual_lifetime_') || mark.includes('pix_lifetime_');
      const record = {
        user_id: s.user_id,
        source: 'subscription',
        status: s.status,
        lifetime: isLifetime,
        current_period_end: s.current_period_end,
        stripe_customer_id: s.stripe_customer_id,
        last_event_at: s.updated_at || s.created_at,
      };
      usersMap.set(s.user_id, record);
    }

    // Merge from paid payment_requests (only add if not present)
    for (const p of paidPayments || []) {
      if (!usersMap.has(p.user_id)) {
        usersMap.set(p.user_id, {
          user_id: p.user_id,
          source: 'payment_request',
          status: 'paid',
          lifetime: true,
          payment_id: p.payment_id,
          paid_at: p.paid_at || p.created_at,
          last_event_at: p.paid_at || p.created_at,
        });
      }
    }

    const userIds = Array.from(usersMap.keys());
    console.log('[LIST-PAID-USERS] Total distinct paid users:', userIds.length);

    // Try to fetch profile data (perfis -> has email, name)
    let profiles: Record<string, any> = {};
    if (userIds.length > 0) {
      const { data: perfis } = await supabase
        .from('perfis')
        .select('id, nome_completo, email')
        .in('id', userIds);

      for (const p of perfis || []) {
        profiles[p.id] = { email: p.email, name: p.nome_completo };
      }

      // Fallback: user_profiles (username as email-like)
      const missing = userIds.filter((id) => !profiles[id]);
      if (missing.length > 0) {
        const { data: userProfiles } = await supabase
          .from('user_profiles')
          .select('id, username, full_name')
          .in('id', missing);
        for (const up of userProfiles || []) {
          profiles[up.id] = { email: up.username, name: up.full_name };
        }
      }
    }

    const result = userIds
      .map((uid) => {
        const base = usersMap.get(uid);
        const prof = profiles[uid] || {};
        return {
          user_id: uid,
          email: prof.email || null,
          name: prof.name || null,
          status: base.status,
          lifetime: base.lifetime,
          source: base.source,
          current_period_end: base.current_period_end || null,
          payment_id: base.payment_id || null,
          last_event_at: base.last_event_at || null,
        };
      })
      .sort((a, b) => new Date(b.last_event_at || 0).getTime() - new Date(a.last_event_at || 0).getTime());

    return new Response(JSON.stringify({ count: result.length, users: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('[LIST-PAID-USERS] Error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});