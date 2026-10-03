// Emails Nick when a member submits or updates an add-on brief.
// Called by the member page with the member's own session (deploy WITH jwt verification, the default).
// Secrets: RESEND_API_KEY, WELCOME_FROM, NOTIFY_EMAIL (already set for the welcome pack).
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://corekitai.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user } } = await admin.auth.getUser(token);
    if (!user) return json({ error: "Sign in first" }, 401);
    const { addon_key } = await req.json();
    const { data: brief } = await admin.from("addon_briefs").select("*").eq("user_id", user.id).eq("addon_key", String(addon_key)).maybeSingle();
    if (!brief) return json({ error: "No brief" }, 404);

    const KEY = Deno.env.get("RESEND_API_KEY"), FROM = Deno.env.get("WELCOME_FROM"), TO = Deno.env.get("NOTIFY_EMAIL");
    if (!KEY || !FROM || !TO) return json({ ok: true, emailed: false });
    const { data: intake } = await admin.from("intake").select("business_name").eq("user_id", user.id).maybeSingle();
    const lines = Object.entries(brief.answers ?? {}).map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join("\n\n");
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM, to: [TO], reply_to: user.email,
        subject: `Brief: ${brief.addon_key} from ${intake?.business_name || user.email}`,
        text: `${user.email} sent their ${brief.addon_key} brief.\n\n${lines}\n\nReply to this email to answer them directly.\nAdmin: ${SITE_URL}/admin.html`,
      }),
    });
    return json({ ok: true, emailed: r.ok });
  } catch (e) {
    console.error(e);
    return json({ error: "Couldn't notify" }, 500);
  }
});
