// Stripe -> Supabase: records every purchase and invites the buyer to the member area.
// Deploy with:  supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets:      STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SITE_URL
import Stripe from "npm:stripe@17";
import { stripe, admin, fulfill } from "../_shared/fulfill.ts";

const crypto = Stripe.createSubtleCryptoProvider();

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
    if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
      await fulfill(event.data.object as Stripe.Checkout.Session);
    }
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      await admin.from("purchases").update({ active: false }).eq("stripe_subscription_id", sub.id);
    }
  } catch (e) {
    console.error(e);
    return new Response("Handler error", { status: 500 }); // Stripe retries
  }
  return new Response(JSON.stringify({ received: true }), { headers: { "content-type": "application/json" } });
});
