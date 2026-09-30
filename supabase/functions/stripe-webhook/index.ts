// Stripe -> Supabase: records every purchase and invites the buyer to the member area.
// Deploy with:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets:      STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SITE_URL
import Stripe from "npm:stripe@17";
import { createClient } from "npm:@supabase/supabase-js@2";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { httpClient: Stripe.createFetchHttpClient() });
const crypto = Stripe.createSubtleCryptoProvider();
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SITE_URL = Deno.env.get("SITE_URL") ?? "https://nickconenna.com";

Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");
  const payload = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature!, Deno.env.get("STRIPE_WEBHOOK_SECRET")!, undefined, crypto);
  } catch {
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const email = s.customer_details?.email?.toLowerCase();
      if (!email) return ok();

      const items = await stripe.checkout.sessions.listLineItems(s.id, { expand: ["data.price"], limit: 50 });
      const rows = items.data.map((li) => ({
        email,
        lookup_key: (li.price as Stripe.Price | null)?.lookup_key ?? (li.price as Stripe.Price | null)?.id ?? "unknown",
        amount_cents: li.amount_total,
        currency: li.currency,
        stripe_session_id: s.id,
        stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null,
      }));
      const { error } = await admin.from("purchases").upsert(rows, { onConflict: "stripe_session_id,lookup_key", ignoreDuplicates: true });
      if (error) throw error;

      // New buyers get an invite email; returning members just sign in as usual.
      const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE_URL}/members.html` });
      if (inviteError && !/already/i.test(inviteError.message)) console.error("invite:", inviteError.message);
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await admin.from("purchases").update({ active: false }).eq("stripe_subscription_id", sub.id);
    }
  } catch (e) {
    console.error(e);
    return new Response("Handler error", { status: 500 }); // Stripe retries
  }
  return ok();
});

const ok = () => new Response(JSON.stringify({ received: true }), { headers: { "content-type": "application/json" } });
