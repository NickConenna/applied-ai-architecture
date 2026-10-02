// Welcome pack: one email per paid checkout, sent through Resend from Nick.
// Explains how the member area works, tailored to what they bought, with a one-tap sign-in link.
// Secrets: RESEND_API_KEY, WELCOME_FROM (e.g. "Nick Conenna <nick@nickconenna.com>", domain verified in Resend),
// optional WELCOME_REPLY_TO, optional NOTIFY_EMAIL (you get a short "new order" note).
import { admin, SITE_URL } from "./fulfill.ts";

const RESEND = Deno.env.get("RESEND_API_KEY");
const FROM = Deno.env.get("WELCOME_FROM");
const REPLY_TO = Deno.env.get("WELCOME_REPLY_TO") ?? "nick@peakingwaters.com";
const NOTIFY = Deno.env.get("NOTIFY_EMAIL");

export const welcomeReady = () => Boolean(RESEND && FROM);

// What each purchase is, and what happens next. Keep in step with kit_modules content.
const BRIEF = "Fill in your brief under \"Your add-ons\" in your member area. It takes a few minutes, and I'm notified right away.";
const ITEMS: Record<string, { name: string; next: string }> = {
  core_kit: { name: "Core Kit", next: "Fill in \"About your business\" in your member area. Within one business day I add a note to your baseline with the one number to watch." },
  addon_catalysts: { name: "Catalysts", next: BRIEF },
  addon_brand: { name: "Brand", next: BRIEF },
  addon_crew_monthly: { name: "Crew", next: BRIEF },
  addon_mapping: { name: "Mapping", next: BRIEF },
  addon_benchmarks_deposit: { name: "Benchmarks", next: BRIEF },
  build_customization: { name: "Customization", next: BRIEF },
  build_website_deposit: { name: "Website build", next: BRIEF },
  build_webapp_deposit: { name: "Web app build", next: BRIEF },
  build_mobile_deposit: { name: "Mobile app build", next: BRIEF },
  build_agent_deposit: { name: "AI agent build", next: BRIEF },
  studio_discovery: { name: "Discovery", next: BRIEF },
  studio_retainer_monthly: { name: "Studio retainer", next: BRIEF },
  journey_deposit: { name: "Journey", next: "Email me to book the kickoff call where we map the whole path." },
};

const esc = (t: string) => t.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

function build(keys: string[], link: string | null) {
  const owned = keys.map((k) => ITEMS[k] ?? { name: k, next: "Email me and I'll take it from here." });
  const hasKit = keys.includes("core_kit");
  const signIn = link ?? `${SITE_URL}/members.html`;
  const how = hasKit ? [
    ["Tell me about your business", "In your member area, fill in \"About your business.\" Two minutes. Everything else is shaped by it."],
    ["Work your steps", "Your steps are matched to what you're starting. Each one ends with something live. Mark them done as you go."],
    ["Set your numbers", "Your baseline shows standard prices for businesses like yours, what it costs to open, and how many sales cover your costs."],
    ["Ask your AI partner", "Claude, set up with your answers and your numbers. Ask it anything, and save the good answers to your files."],
    ["Hear from me", "I add a note to your baseline within one business day, and deliver anything you've bought to your files."],
  ] : [];

  const html = `<!doctype html><html><body style="margin:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Helvetica Neue',Arial,sans-serif;color:#1d1d1f">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fff;border-radius:20px">
<tr><td style="padding:36px 32px 8px">
  <p style="margin:0 0 6px;color:#ff6b00;font-weight:600;font-size:15px">You're in.</p>
  <h1 style="margin:0 0 14px;font-size:28px;line-height:1.15">Welcome. Here's how it works.</h1>
  <p style="margin:0 0 22px;font-size:16px;line-height:1.55;color:#333">Thanks for your order: <b>${owned.map((o) => esc(o.name)).join(", ")}</b>. Everything lives in your member area, and I'm with you the whole way.</p>
  <p style="margin:0 0 8px"><a href="${esc(signIn)}" style="display:inline-block;background:#0071e3;color:#fff;text-decoration:none;font-weight:600;font-size:16px;padding:13px 24px;border-radius:99px">Open my member area</a></p>
  <p style="margin:0 0 26px;font-size:13px;color:#6e6e73">This button signs you in once and expires soon. Any time after, go to <a href="${SITE_URL}/members.html" style="color:#0066cc">${SITE_URL.replace(/^https?:\/\//, "")}/members.html</a> and enter this email for a fresh link. No password.</p>
</td></tr>
${how.length ? `<tr><td style="padding:0 32px 8px"><h2 style="margin:0 0 12px;font-size:19px">Your first week</h2>
  ${how.map(([h, b], i) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 14px"><tr>
    <td valign="top" style="width:30px;font-weight:700;color:#ff6b00;font-size:16px">${i + 1}</td>
    <td style="font-size:15px;line-height:1.5"><b>${esc(h)}.</b> ${esc(b)}</td></tr></table>`).join("")}
</td></tr>` : ""}
<tr><td style="padding:8px 32px 8px"><h2 style="margin:0 0 12px;font-size:19px">What happens next</h2>
  ${owned.map((o) => `<p style="margin:0 0 12px;font-size:15px;line-height:1.5"><b>${esc(o.name)}:</b> ${esc(o.next)}</p>`).join("")}
</td></tr>
<tr><td style="padding:8px 32px 32px">
  <p style="margin:0;font-size:15px;line-height:1.55">Questions, or stuck on anything? Just reply to this email. It comes straight to me.</p>
  <p style="margin:16px 0 0;font-size:15px">Nick Conenna</p>
</td></tr></table>
<p style="font-size:12px;color:#6e6e73;margin:16px 0 0">Peaking Waters LLC · Cornelius, North Carolina · <a href="${SITE_URL}/privacy.html" style="color:#6e6e73">Privacy</a></p>
</td></tr></table></body></html>`;

  const text = [
    `You're in. Welcome. Here's how it works.`, ``,
    `Thanks for your order: ${owned.map((o) => o.name).join(", ")}.`, ``,
    `Open your member area: ${signIn}`,
    `(That link signs you in once. Any time after, go to ${SITE_URL}/members.html and enter this email. No password.)`, ``,
    ...(how.length ? [`YOUR FIRST WEEK`, ...how.map(([h, b], i) => `${i + 1}. ${h}. ${b}`), ``] : []),
    `WHAT HAPPENS NEXT`, ...owned.map((o) => `- ${o.name}: ${o.next}`), ``,
    `Questions? Reply to this email. It comes straight to me.`, ``, `Nick Conenna`,
  ].join("\n");
  return { html, text, subject: hasKit ? "Welcome to your Core Kit: here's how it works" : `Your order: ${owned.map((o) => o.name).join(", ")}` };
}

async function resend(body: Record<string, unknown>, key: string) {
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND}`, "Content-Type": "application/json", "Idempotency-Key": key },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`resend ${r.status}: ${await r.text()}`);
}

// Sends at most once per checkout session, even if the webhook and thanks page both fire.
export async function sendWelcome(sessionId: string, email: string, keys: string[]) {
  if (!welcomeReady()) return;
  const { error: claim } = await admin.from("welcome_emails").insert({ session_id: sessionId, email });
  if (claim) return; // already sent (or being sent) for this session

  try {
    let link: string | null = null;
    const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email, options: { redirectTo: `${SITE_URL}/members.html` } });
    if (!error) link = data?.properties?.action_link ?? null;

    const m = build(keys, link);
    await resend({ from: FROM, to: [email], reply_to: REPLY_TO, subject: m.subject, html: m.html, text: m.text }, `welcome-${sessionId}`);
    if (NOTIFY) {
      await resend({ from: FROM, to: [NOTIFY], subject: `New order: ${keys.join(", ")}`, text: `${email} bought ${keys.join(", ")}.\nAdmin: ${SITE_URL}/admin.html` }, `notify-${sessionId}`)
        .catch((e) => console.error("notify:", e.message));
    }
  } catch (e) {
    console.error("welcome:", (e as Error).message);
    await admin.from("welcome_emails").delete().eq("session_id", sessionId); // let a webhook retry send it
    throw e;
  }
}

export const previewWelcome = build; // for local preview only
