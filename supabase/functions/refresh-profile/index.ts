// Keeps each member's customer file: Claude reads everything they've shared and rewrites
// a short profile plus structured facts. Called by the member page (their own file) or by an
// admin (any member's file). Deploy WITH jwt verification (the default).
// Secrets: ANTHROPIC_API_KEY, optional ANTHROPIC_MODEL.
import { createClient } from "npm:@supabase/supabase-js@2";
import { customerContext } from "../_shared/context.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-5-5";
const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "content-type": "application/json" } });

const SYSTEM = `You maintain the customer file for one member of Nick Conenna's Core Kit, a program that helps people launch real businesses.
You get everything they've shared: intake answers, baseline numbers, add-on briefs, saved drafts, recent AI partner conversations, Nick's note, and the previous customer file.
Write the file Nick and the AI partner will rely on. Only include what the material supports; never invent details. Newer information wins over older.

Return ONLY a JSON object, no other text, in this shape:
{
  "summary": "120 to 220 words, plain English, short paragraphs: who they are and what they're building, their offer and customers, their numbers, where they are now, what they've decided, and what's most important next.",
  "facts": {
    "business_name": "", "offer": "", "customers": "", "location": "", "price_points": "",
    "buy_link": "", "domain": "", "brand_likes": "", "colors": "", "budget": "", "goals": "",
    "decisions": [], "open_questions": []
  }
}
Leave a fact as "" (or [] for lists) when unknown.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    const { data: { user: caller } } = await admin.auth.getUser(token);
    if (!caller) return json({ error: "Sign in first" }, 401);
    const body = await req.json().catch(() => ({}));

    let target = { id: caller.id, email: caller.email };
    if (body.user_id && body.user_id !== caller.id) {
      const { data: isAdmin } = await admin.from("admins").select("user_id").eq("user_id", caller.id).maybeSingle();
      if (!isAdmin) return json({ error: "Not allowed" }, 403);
      const { data } = await admin.auth.admin.getUserById(String(body.user_id));
      if (!data?.user) return json({ error: "No such member" }, 404);
      target = { id: data.user.id, email: data.user.email };
    }

    // Don't rewrite more than once a minute unless an admin forces it.
    const { data: prev } = await admin.from("customer_profiles").select("summary, facts, updated_at").eq("user_id", target.id).maybeSingle();
    if (prev && !body.force && Date.now() - new Date(prev.updated_at).getTime() < 60_000) return json({ ...prev, skipped: true });

    const ctx = await customerContext(admin, target);
    if (!ctx.owned.length) return json({ error: "No kit" }, 403);
    const { data: chat } = await admin.from("ai_messages").select("role, content").eq("user_id", target.id)
      .order("created_at", { ascending: false }).limit(30);
    const convo = (chat ?? []).reverse().map((m: any) => `${m.role === "user" ? "Member" : "AI partner"}: ${String(m.content).slice(0, 600)}`).join("\n");

    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1500, system: SYSTEM,
        messages: [{ role: "user", content: `${ctx.text}\n\nRecent AI partner conversation (oldest first):\n${convo || "none yet"}` }] }),
    });
    if (!r.ok) { console.error("anthropic", r.status, await r.text()); return json({ error: "AI unavailable" }, 502); }
    const out = (await r.json()).content?.filter((c: any) => c.type === "text").map((c: any) => c.text).join("") ?? "";
    const m = out.match(/\{[\s\S]*\}/);
    if (!m) return json({ error: "Couldn't read the profile" }, 502);
    const parsed = JSON.parse(m[0]);
    const row = { user_id: target.id, summary: String(parsed.summary ?? "").slice(0, 4000), facts: parsed.facts ?? {}, updated_at: new Date().toISOString() };
    const { error } = await admin.from("customer_profiles").upsert(row);
    if (error) throw error;
    return json({ summary: row.summary, facts: row.facts, updated_at: row.updated_at });
  } catch (e) {
    console.error(e);
    return json({ error: "Couldn't update the customer file" }, 500);
  }
});
