// CoreKit AI: portfolio company AI scan.
// Env vars (set in Vercel, never in code):
//   ANTHROPIC_API_KEY  required
//   SCAN_MODEL         optional, default claude-sonnet-5-5
//   SUPABASE_URL, SUPABASE_SERVICE_KEY   optional, logs leads
//   RESEND_API_KEY, RESEND_FROM          optional, emails results
//   NOTIFY_EMAIL       optional, default nick@peakingwaters.com

const MODEL = process.env.SCAN_MODEL || "claude-sonnet-5-5";
const NOTIFY = process.env.NOTIFY_EMAIL || "nick@peakingwaters.com";
const clean = (v, max) => String(v || "").replace(/[<>]/g, "").trim().slice(0, max);
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });
  const b = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (b.company_url) return res.status(200).json({ ok: true }); // honeypot

  const name = clean(b.name, 80), email = clean(b.email, 160), company = clean(b.company, 160);
  const role = clean(b.role, 60), size = clean(b.size, 40), goal = clean(b.goal, 60);
  const does = clean(b.does, 600), leak = clean(b.leak, 900), tools = clean(b.tools, 300);
  if (!name || !does || !leak || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return res.status(400).json({ error: "Add your name, a valid email, what your company does, and where time or money leaks." });
  }
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: "The scan is not configured yet. Email nick@peakingwaters.com and I'll run it myself." });

  const system = `You are Nick Conenna's scan assistant. Nick is an applied AI architect at CoreKit AI who builds production AI systems for PE-backed and independent mid-market companies. Think like an operating partner or owner: favor margin, capacity, and revenue impact a sponsor would recognize. Be specific to what the person wrote, realistic, and plain-spoken. No hype. Never invent facts about their company; when you estimate impact, state the assumption.`;
  const prompt = `Company: ${company || "(not given)"}
Role: ${role || "(not given)"}  Team size: ${size || "(not given)"}  Main goal: ${goal || "(not given)"}
What the company does: ${does}
Where time or money leaks: ${leak}
Tools they use: ${tools || "(not given)"}

Find the three places where AI would move this company’s numbers fastest, ordered by return for effort and risk. Favor what AI does best today: research and analysis, writing and content, sales prospecting and personalization, documents and reporting, internal tools and software, support knowledge, and workflow agents that hand exceptions to a person.

Reply with only this JSON inside <result></result> tags:
{"summary":"one sentence on where AI fits this company",
 "opportunities":[{"title":"short name","how":"what AI would do, 1-2 sentences","payoff":"realistic time or revenue impact with the assumption stated","effort":"rough build time, like 3 days or 2 weeks","first_step":"the first concrete step"}],
 "quick_win":"one thing they can do today themselves with ChatGPT or Claude, including what to type",
 "build_first":"which opportunity Nick would build first and why, 1-2 sentences"}`;

  let result;
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model: MODEL, max_tokens: 1800, system, messages: [{ role: "user", content: prompt }] })
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.error?.message || "API error");
    const text = (data.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    const m = text.match(/<result>([\s\S]*?)<\/result>/);
    result = JSON.parse(m ? m[1] : text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1));
  } catch (e) {
    console.error("scan failed", e);
    return res.status(502).json({ error: "The scan couldn't finish right now. Try again in a minute, or email nick@peakingwaters.com." });
  }
  result.opportunities = (result.opportunities || []).slice(0, 3);

  const tasks = [];
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_KEY) {
    tasks.push(fetch(`${process.env.SUPABASE_URL}/rest/v1/leads`, {
      method: "POST",
      headers: { apikey: process.env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_KEY}`, "content-type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ source: "opportunity_scan", business: company, email, category: role, website: company,
        result: { name, role, size, goal, does, leak, tools, ...result } })
    }));
  }
  if (process.env.RESEND_API_KEY && process.env.RESEND_FROM) {
    const ops = result.opportunities.map((o) => `<li><b>${esc(o.title)}</b>: ${esc(o.how)}<br>Payoff: ${esc(o.payoff)}. Effort: ${esc(o.effort)}.<br>First step: ${esc(o.first_step)}</li>`).join("");
    const html = `<p>Hi ${esc(name)},</p><p>${esc(result.summary)}</p><ol>${ops}</ol><p><b>Something you can do today:</b> ${esc(result.quick_win)}</p><p><b>What I'd build first:</b> ${esc(result.build_first)}</p><p>Want to talk it through? Reply here or book 20 minutes at https://corekitai.com/#contact</p><p>Nick Conenna<br>CoreKit AI</p>`;
    const send = (to, subject, replyTo) => fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({ from: process.env.RESEND_FROM, to: [to], subject, html, ...(replyTo ? { reply_to: replyTo } : {}) })
    });
    tasks.push(send(email, "Your CoreKit AI scan", NOTIFY));
    tasks.push(send(NOTIFY, `New scan: ${name}${company ? ", " + company : ""} (${goal || "no goal"})`, email));
  }
  await Promise.allSettled(tasks);
  return res.status(200).json({ ok: true, name, ...result });
};
