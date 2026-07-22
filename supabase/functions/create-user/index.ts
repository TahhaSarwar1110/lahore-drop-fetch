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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Verify admin user
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user is admin
    const { data: adminRole } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!adminRole) {
      console.error('User is not admin');
      return new Response(JSON.stringify({ error: 'Forbidden - Admin only' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();

    // Server-side input validation (defense in depth — never trust the client)
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allowedRoles = ['admin', 'manager', 'rider', 'customer'];
    const errors: string[] = [];

    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const full_name = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const role = typeof body.role === 'string' ? body.role.trim() : '';

    if (!email || !emailRe.test(email) || email.length > 254) errors.push('Invalid email');
    if (!password || password.length < 8 || password.length > 128) errors.push('Password must be 8-128 chars');
    if (!full_name || full_name.length < 2 || full_name.length > 100) errors.push('Full name must be 2-100 chars');
    if (!phone || phone.length < 7 || phone.length > 20 || !/^[+\d\s()-]+$/.test(phone)) errors.push('Invalid phone');
    if (!allowedRoles.includes(role)) errors.push('Invalid role');

    if (errors.length) {
      return new Response(JSON.stringify({ error: 'Validation failed', details: errors }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }


    console.log('Creating user with email:', email);

    // Create auth user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, phone },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(JSON.stringify({ error: createError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('User created:', newUser.user.id);

    // Profile is created automatically by trigger, now assign role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUser.user.id, role });

    if (roleError) {
      console.error('Error assigning role:', roleError);
      // User created but role assignment failed
      return new Response(JSON.stringify({ 
        error: 'User created but role assignment failed',
        userId: newUser.user.id 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Role assigned successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      userId: newUser.user.id,
      message: 'User created successfully' 
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