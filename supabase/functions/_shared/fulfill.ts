// One place that turns a paid Stripe Checkout Session into member access.
// Used by stripe-webhook (always) and claim-order (instant, from the thanks page).
// Safe to run twice for the same session: every write is idempotent.
import Stripe from "npm:stripe@17";
import { createClient, SupabaseClient } from "npm:@supabase/supabase-js@2";

export const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, { httpClient: Stripe.createFetchHttpClient() });
export const admin: SupabaseClient = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
export const SITE_URL = Deno.env.get("SITE_URL") ?? "https://nickconenna.com";

const TRACKS = ["service", "products", "food", "publishing", "app", "other"];

export type Fulfilled = { email: string; userId: string | null; keys: string[] };

export async function fulfill(sessionOrId: Stripe.Checkout.Session | string): Promise<Fulfilled | null> {
  const s = typeof sessionOrId === "string" ? await stripe.checkout.sessions.retrieve(sessionOrId) : sessionOrId;
  if (s.status !== "complete" || !["paid", "no_payment_required"].includes(s.payment_status)) return null;
  const email = s.customer_details?.email?.toLowerCase();
  if (!email) return null;

  // 1. Record every line item as a purchase.
  const items = await stripe.checkout.sessions.listLineItems(s.id, { expand: ["data.price"], limit: 50 });
  const rows = items.data.map((li) => {
    const p = li.price as Stripe.Price | null;
    return {
      email,
      lookup_key: p?.lookup_key ?? p?.id ?? "unknown",
      amount_cents: li.amount_total,
      currency: li.currency,
      stripe_session_id: s.id,
      stripe_subscription_id: typeof s.subscription === "string" ? s.subscription : s.subscription?.id ?? null,
    };
  });
  const { error } = await admin.from("purchases").upsert(rows, { onConflict: "stripe_session_id,lookup_key", ignoreDuplicates: true });
  if (error) throw error;

  // 2. Make sure they have an account. New buyers get an invite email as a backup way in.
  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, { redirectTo: `${SITE_URL}/members.html` });
  if (inviteError && !/already|registered|exists/i.test(inviteError.message)) console.error("invite:", inviteError.message);

  // 3. Find their user id (server-only lookup; see migrations/20261001_checkout_claims.sql).
  const { data: userId } = await admin.rpc("user_id_by_email", { e: email });

  // 4. Prefill intake from the configurator answers, without overwriting anything they've saved.
  const m = s.metadata ?? {};
  if (userId && (m.track || m.where)) {
    await admin.from("intake").upsert({
      user_id: userId,
      track: TRACKS.includes(m.track) ? m.track : null,
      location: (m.where || "").slice(0, 120) || null,
      stage: ["idea", "first", "running"].includes(m.stage) ? m.stage : null,
      goal: ["side", "full", "big"].includes(m.goal) ? m.goal : null,
    }, { onConflict: "user_id", ignoreDuplicates: true });
  }

  return { email, userId, keys: rows.map((r) => r.lookup_key) };
}
