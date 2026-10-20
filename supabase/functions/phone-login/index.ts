import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";
import { normalizeLoginPhone, phoneLoginCandidates } from "../_shared/phone-login.ts";

const Body = z.object({
  phone: z.string().trim().min(7).max(30).regex(/^[+\d\s()-]+$/),
  password: z.string().min(6).max(128),
});

Deno.serve(async (req) => {
  const respond = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return respond({ error: "Method not allowed" }, 405);

  try {
    const parsed = Body.safeParse(await req.json());
    if (!parsed.success) return respond({ error: "Invalid mobile number or password" }, 400);
    const { phone, password } = parsed.data;
    const digits = normalizeLoginPhone(phone);
    if (digits.length < 7 || digits.length > 15) return respond({ error: "Invalid mobile number or password" }, 400);

    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const publicKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !publicKey) return respond({ error: "Login temporarily unavailable" }, 503);

    // This client never signs in and never acquires a user's session.
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: profiles, error: lookupError } = await admin.from("profiles")
      .select("id").in("phone", phoneLoginCandidates(phone)).limit(2);
    if (lookupError) return respond({ error: "Login temporarily unavailable" }, 503);

    // Unknown or ambiguous contacts still take the Auth password-validation path.
    // Never return a contact lookup result or a registered email to anonymous callers.
    let email = `${digits}@tabedaar.local`;
    let expectedUserId: string | undefined;
    if (profiles?.length === 1) {
      const { data, error } = await admin.auth.admin.getUserById(profiles[0].id);
      if (error) return respond({ error: "Login temporarily unavailable" }, 503);
      if (data.user.email) {
        email = data.user.email;
        expectedUserId = data.user.id;
      }
    }

    // Auth validates the password and applies its normal account/rate-limit rules.
    const auth = createClient(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.session || !expectedUserId || data.user?.id !== expectedUserId) {
      return respond({ error: "Invalid mobile number or password" }, 400);
    }
    return respond({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
  } catch {
    // Do not log request bodies, passwords, emails or tokens.
    return respond({ error: "Login temporarily unavailable" }, 503);
  }
});