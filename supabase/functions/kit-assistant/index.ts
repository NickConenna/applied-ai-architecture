// The member's AI partner: Claude, grounded in their intake and what they own.
// Deploy with:  supabase functions deploy kit-assistant
// Secrets:      ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL, optional DAILY_LIMIT, SITE_ORIGIN
import { createClient } from "npm:@supabase/supabase-js@2";

const URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
const admin = createClient(URL, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5";
const DAILY_LIMIT = Number(Deno.env.get("DAILY_LIMIT") ?? "40");
const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

const LABELS: Record<string, string> = {
  service: "a local service business", products: "selling products online", food: "a food and drink business",
  publishing: "publishing books", app: "an app or software product", other: "a new business",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  // Act as the signed-in member so row-level security applies.
  const auth = req.headers.get("Authorization") ?? "";
  const member = createClient(URL, ANON, { global: { headers: { Authorization: auth } } });
  const { data: { user } } = await member.auth.getUser();
  if (!user) return json({ error: "Sign in first" }, 401);

  const [{ data: buys }, { data: intake }] = await Promise.all([
    member.from("purchases").select("lookup_key").eq("active", true),
    member.from("intake").select("*").eq("user_id", user.id).maybeSingle(),
  ]);
  if (!buys?.length) return json({ error: "Your AI partner comes with a kit" }, 403);

  const since = new Date(Date.now() - 86_400_000).toISOString();
  const { count } = await admin.from("ai_messages").select("id", { count: "exact", head: true })
    .eq("user_id", user.id).eq("role", "user").gte("created_at", since);
  if ((count ?? 0) >= DAILY_LIMIT) return json({ reply: "That's today's limit. Pick it up tomorrow, or email Nick if it's urgent." });

  const body = await req.json().catch(() => ({}));
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m: any) => (m?.role === "user" || m?.role === "assistant") && typeof m?.content === "string")
    .slice(-12)
    .map((m: any) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return json({ error: "Ask a question" }, 400);

  const owned = [...new Set(buys.map((b) => b.lookup_key))].join(", ");
  const system = `You are the AI partner inside Nick Conenna's Core Kit, helping a founder launch and grow a real business the way they want.

About this founder:
- Business: ${intake?.business_name || "not named yet"}
- Starting: ${LABELS[intake?.track ?? "other"] ?? "a new business"}
- Based in: ${intake?.location || "not given"}
- Stage: ${intake?.stage || "not given"}
- Goal: ${intake?.goal || "not given"}
- In their words: ${intake?.about || "not given"}
- What they own: ${owned}

How to help:
- Be practical and specific to their business. Give the next concrete step, not a lecture.
- Keep answers short: a few sentences or a short list. Offer to go deeper.
- Respect their vision. Suggest, don't overrule.
- When numbers matter, show your reasoning and say what they should check locally.
- For legal, tax, licensing, or financial decisions, give general orientation and tell them to confirm with the right professional or local office.
- If they need hands-on help, mention they can email Nick or add Customization, Mapping, or a build from their member area.
- If intake is missing, ask them to fill in "About your business" on the member page.`;

  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1024, system, messages }),
  });
  if (!r.ok) { console.error("anthropic", r.status, await r.text()); return json({ error: "AI unavailable" }, 502); }
  const data = await r.json();
  const reply = (data.content ?? []).filter((c: any) => c.type === "text").map((c: any) => c.text).join("\n").trim();

  await admin.from("ai_messages").insert([
    { user_id: user.id, role: "user", content: messages[messages.length - 1].content },
    { user_id: user.id, role: "assistant", content: reply },
  ]);
  return json({ reply });
});
