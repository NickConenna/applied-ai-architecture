// The cart: turns whatever the visitor picked into ONE Stripe Checkout with every item on it.
// Deploy with:  supabase functions deploy create-checkout --no-verify-jwt
// Secrets:      STRIPE_SECRET_KEY, SITE_URL, SITE_ORIGIN (already set for the other functions)
import Stripe from "npm:stripe@17";
import { stripe, admin, SITE_URL } from "../_shared/fulfill.ts";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

// Only these can be bought online. Journey stays by application.
const SELLABLE = new Set([
  "core_kit", "addon_catalysts", "addon_brand", "addon_crew_monthly", "addon_mapping", "addon_benchmarks_deposit",
  "build_customization", "build_website_deposit", "build_webapp_deposit", "build_mobile_deposit", "build_agent_deposit",
  "studio_discovery", "studio_retainer_monthly",
]);
const clip = (v: unknown, n = 120) => String(v ?? "").slice(0, n);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    let keys = [...new Set<string>((Array.isArray(body.items) ? body.items : []).map(String))].filter((k) => SELLABLE.has(k));
    if (!keys.length) return json({ error: "Nothing to check out" }, 400);

    // Who's buying? Signed-in members send their own session token; visitors send the public key.
    let memberEmail: string | undefined;
    const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
    if (token) {
      const { data } = await admin.auth.getUser(token);
      memberEmail = data?.user?.email?.toLowerCase() ?? undefined;
    }
    let owned = new Set<string>();
    if (memberEmail) {
      const { data: rows } = await admin.from("purchases").select("lookup_key").eq("email", memberEmail).eq("active", true);
      owned = new Set((rows ?? []).map((r: { lookup_key: string }) => r.lookup_key));
    }
    const ownsKit = owned.has("core_kit");

    // Never charge twice: members don't rebuy the Core Kit or an add-on they already have.
    keys = keys.filter((k) => !(owned.has(k) && (k === "core_kit" || k.startsWith("addon_"))));
    if (!keys.length) return json({ error: "You already have everything in this order", code: "already_owned" }, 400);

    // For now, add-ons come with or after the Core Kit, never alone.
    if (!keys.includes("core_kit") && !ownsKit) {
      return json({ error: "Add-ons need the Core Kit first", code: "needs_core_kit" }, 403);
    }

    const prices = await stripe.prices.list({ lookup_keys: keys, active: true, limit: 20 });
    const missing = keys.filter((k) => !prices.data.some((p) => p.lookup_key === k));
    if (missing.length) return json({ error: "Unknown items", missing }, 400);

    const recurring = prices.data.some((p) => p.recurring);
    const metadata = {
      track: clip(body.track, 20), where: clip(body.where), stage: clip(body.stage, 20), goal: clip(body.goal, 20),
      items: keys.join(","),
    };
    // Members check out under their account email, so the purchase lands on their kit.
    const email = memberEmail ?? (typeof body.email === "string" && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.email) ? body.email : undefined);

    const params: Stripe.Checkout.SessionCreateParams = {
      mode: recurring ? "subscription" : "payment",
      // keep the order the visitor saw: Core Kit first
      line_items: keys.map((k) => ({ price: prices.data.find((p) => p.lookup_key === k)!.id, quantity: 1 })),
      success_url: `${SITE_URL}/thanks.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: memberEmail && ownsKit ? `${SITE_URL}/members.html#add` : `${SITE_URL}/#addons`,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      customer_email: email,
      metadata,
    };
    if (recurring) params.subscription_data = { metadata };
    else { params.customer_creation = "always"; params.payment_intent_data = { metadata }; params.invoice_creation = { enabled: true }; }

    const session = await stripe.checkout.sessions.create(params);
    return json({ url: session.url });
  } catch (e) {
    console.error(e);
    return json({ error: "Checkout unavailable" }, 500);
  }
});
