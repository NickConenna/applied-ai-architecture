// Instant delivery: the thanks page trades the Stripe session id for a one-time sign-in,
// so a buyer lands in their member area seconds after paying, no inbox needed.
// Each paid session can be claimed once, within 2 hours. After that, the emailed link is the way in.
// Deploy with:  supabase functions deploy claim-order --no-verify-jwt
import { stripe, admin, fulfill, SITE_URL } from "../_shared/fulfill.ts";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("SITE_ORIGIN") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const { session_id } = await req.json().catch(() => ({}));
    if (typeof session_id !== "string" || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(session_id)) return json({ error: "Bad session" }, 400);

    const s = await stripe.checkout.sessions.retrieve(session_id);
    if (Date.now() / 1000 - s.created > 2 * 60 * 60) return json({ error: "expired", email: s.customer_details?.email ?? null }, 410);

    // Records the purchase now, even if Stripe's webhook hasn't arrived yet.
    const done = await fulfill(s);
    if (!done) return json({ error: "not_paid" }, 402);

    // One claim per session.
    const { error: claimErr } = await admin.from("checkout_claims").insert({ session_id });
    if (claimErr) return json({ error: "claimed", email: done.email, keys: done.keys }, 409);

    const { data, error } = await admin.auth.admin.generateLink({
      type: "magiclink", email: done.email, options: { redirectTo: `${SITE_URL}/members.html` },
    });
    if (error || !data?.properties?.action_link) return json({ error: "link", email: done.email, keys: done.keys }, 500);

    return json({ link: data.properties.action_link, email: done.email, keys: done.keys });
  } catch (e) {
    console.error(e);
    return json({ error: "server" }, 500);
  }
});
