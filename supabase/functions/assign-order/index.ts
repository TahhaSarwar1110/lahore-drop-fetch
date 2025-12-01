import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify admin user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin or manager
    const { data: userRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'manager'])
      .maybeSingle();

    if (!userRole) {
      console.error('User is not admin or manager');
      return new Response(JSON.stringify({ error: 'Forbidden - Admin or Manager only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { order_id, rider_id } = await req.json();

    if (!order_id || !rider_id) {
      return new Response(JSON.stringify({ error: 'Missing order_id or rider_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Assigning order:', order_id, 'to rider:', rider_id);

    // Check if rider exists and has rider role
    const { data: riderRole } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', rider_id)
      .eq('role', 'rider')
      .maybeSingle();

    if (!riderRole) {
      return new Response(JSON.stringify({ error: 'Invalid rider ID' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if order has any rejected items
    const { data: rejectedItems } = await supabaseClient
      .from('order_items')
      .select('id')
      .eq('order_id', order_id)
      .eq('approval_status', 'rejected');

    if (rejectedItems && rejectedItems.length > 0) {
      return new Response(JSON.stringify({ 
        error: 'Cannot assign rider: all items must be approved first. This order has rejected items.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create assignment (will update if already exists due to UNIQUE constraint)
    const { error: assignError } = await supabaseClient
      .from('order_assignments')
      .upsert({
        order_id,
        rider_id,
        assigned_by: user.id,
      }, { onConflict: 'order_id' });

    if (assignError) {
      console.error('Error assigning order:', assignError);
      return new Response(JSON.stringify({ error: assignError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Order assigned successfully');

    return new Response(JSON.stringify({ 
      success: true,
      message: 'Order assigned successfully' 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});