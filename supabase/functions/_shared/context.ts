// One picture of a customer, used by the AI partner and the customer-file writer.
// Pass a member client (RLS) or the service client; both see the same rows for this user.
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

const LABELS: Record<string, string> = {
  service: "a local service business", products: "selling products online", food: "a food and drink business",
  publishing: "publishing books", app: "an app or software product", other: "a new business",
};
const STAGE: Record<string, string> = { idea: "just an idea", first: "getting first customers", running: "already running" };
const GOAL: Record<string, string> = { side: "side income", full: "a full-time living", big: "building something big" };
const STATUS: Record<string, string> = { submitted: "received, waiting on Nick", in_progress: "Nick is working on it", delivered: "delivered" };
const usd = (n: unknown) => typeof n === "number" ? "$" + n.toLocaleString("en-US") : "not set";
const clip = (t: unknown, n: number) => { const s = String(t ?? ""); return s.length > n ? s.slice(0, n) + "..." : s; };

export type Customer = { id: string; email?: string | null };

export async function customerContext(db: SupabaseClient, u: Customer) {
  const email = (u.email ?? "").toLowerCase();
  const [{ data: buys }, { data: intake }, { data: base }, { data: note }, { data: mods }, { data: prog },
         { data: briefs }, { data: files }, { data: profile }] = await Promise.all([
    db.from("purchases").select("lookup_key").eq("email", email).eq("active", true),
    db.from("intake").select("*").eq("user_id", u.id).maybeSingle(),
    db.from("baselines").select("*").eq("user_id", u.id).maybeSingle(),
    db.from("baseline_notes").select("note").eq("user_id", u.id).maybeSingle(),
    db.from("kit_modules").select("id, title, track, sort").order("sort"),
    db.from("step_progress").select("module_id").eq("user_id", u.id),
    db.from("addon_briefs").select("addon_key, answers, status").eq("user_id", u.id),
    db.from("member_files").select("title, kind, body, created_by, created_at").eq("user_id", u.id).order("created_at", { ascending: false }).limit(10),
    db.from("customer_profiles").select("summary, facts, updated_at").eq("user_id", u.id).maybeSingle(),
  ]);
  const owned = [...new Set((buys ?? []).map((b: any) => b.lookup_key as string))];

  const doneIds = new Set((prog ?? []).map((r: any) => String(r.module_id)));
  const steps = (mods ?? []).filter((m: any) => m.track === "all" || m.track === intake?.track)
    .map((m: any) => `${m.title} (${doneIds.has(String(m.id)) ? "done" : "not done"})`).join("; ");

  let numbers = "They haven't opened their baseline yet.";
  if (base) {
    const prices = (base.prices ?? []).map((p: any) =>
      `  - ${p.name}: their price ${usd(p.yours)}; standard ${p.low != null && p.high != null ? usd(p.low) + " to " + usd(p.high) : "not set by Nick yet"}`).join("\n");
    const cost = (c: any) => c.need === "Skip" ? 0 : Number(c.yours ?? c.typical ?? 0) || 0;
    const nowTotal = (base.costs ?? []).filter((c: any) => c.need === "Now").reduce((a: number, c: any) => a + cost(c), 0);
    const later = (base.costs ?? []).filter((c: any) => c.need === "Later").map((c: any) => c.item).join(", ") || "none";
    const price = base.prices?.[0]?.yours;
    const keep = typeof price === "number" ? price - (base.cost_per_sale ?? 0) - (price * 0.029 + 0.3) : null;
    const be = keep == null ? "not enough numbers yet" : keep <= 0 ? "they lose money on each sale" : `${Math.ceil((base.monthly_costs ?? 0) / keep)} sale(s) a month (keeps about $${keep.toFixed(2)} per sale after the card fee)`;
    numbers = `Prices:\n${prices}\n- Startup cost needed now: $${nowTotal.toLocaleString("en-US")}\n- Deferred until sales: ${later}\n- Cost per sale: ${usd(base.cost_per_sale)}; monthly costs: ${usd(base.monthly_costs)}\n- Break-even: ${be}`;
  }

  const briefText = (briefs ?? []).length
    ? (briefs ?? []).map((b: any) => `- ${b.addon_key} (${STATUS[b.status] ?? b.status}): ` +
        Object.entries(b.answers ?? {}).map(([k, v]) => `${k.replace(/_/g, " ")}: ${clip(v, 400)}`).join("; ")).join("\n")
    : "none yet";
  const fileText = (files ?? []).length
    ? (files ?? []).map((f: any) => f.kind === "draft"
        ? `- Draft "${f.title}" (saved ${String(f.created_at).slice(0, 10)}): ${clip(f.body, 500)}`
        : `- File from Nick: "${f.title}" (${String(f.created_at).slice(0, 10)})`).join("\n")
    : "none yet";

  const text = `About this founder:
- Business: ${intake?.business_name || "not named yet"}
- Starting: ${LABELS[intake?.track ?? "other"] ?? "a new business"}
- Based in: ${intake?.location || "not given"}
- Stage: ${STAGE[intake?.stage ?? ""] || "not given"}
- Goal: ${GOAL[intake?.goal ?? ""] || "not given"}
- In their words: ${intake?.about || "not given"}
- What they own: ${owned.join(", ") || "nothing yet"}
- Their kit steps, in order: ${steps || "none yet"}

Their baseline numbers (live, they edit these on their member page):
${numbers}

Nick's note to them: ${note?.note || "none yet"}

Their add-on briefs (what they told Nick for each add-on):
${briefText}

Their saved drafts and files (newest first):
${fileText}

Customer file (Claude's running summary of everything so far${profile?.updated_at ? ", updated " + String(profile.updated_at).slice(0, 10) : ""}):
${profile?.summary || "not written yet"}`;

  return { text, owned, intake, profile };
}
