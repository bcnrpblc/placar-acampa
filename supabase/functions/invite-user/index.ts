// Superadmin-only: emails an invite to a new user, optionally granting admin.
// Secrets: SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are injected by Supabase.
// Deploy: supabase functions deploy invite-user
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: isSuper } = await caller.rpc("is_superadmin");
  if (isSuper !== true) return json({ error: "Somente o superadmin pode convidar usuários" }, 403);

  const { email, admin = true, redirectTo } = await req.json().catch(() => ({}));
  if (typeof email !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "E-mail inválido" }, 400);
  }

  const service = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data, error } = await service.auth.admin.inviteUserByEmail(email, { redirectTo });
  if (error) return json({ error: error.message }, 400);

  if (admin) {
    const { error: roleError } = await service
      .from("user_roles")
      .upsert({ user_id: data.user.id, role: "admin" }, { onConflict: "user_id,role" });
    if (roleError) return json({ error: `Convite enviado, mas falhou ao conceder admin: ${roleError.message}` }, 500);
  }

  return json({ ok: true, user_id: data.user.id });
});
