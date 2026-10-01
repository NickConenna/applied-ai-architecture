# nickconenna.com update kit: Core Kit, Build, and the member area

We weave AI into your business: every kit is delivered in a private member area on **Supabase**, with an AI partner on **Claude**, paid through **Stripe**. You own all of it. This is not a storefront template.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | Home: AI woven in, Core Kit configurator, tracks, "This isn't Shopify," add-on builder, Build teaser |
| `build.html` | Web, app, and AI agent development on Supabase and Claude, with deposit checkout |
| `members.html` | **Gated** member area: sign-in link, kit steps, intake, AI partner, upgrades |
| `thanks.html` | Where Stripe sends buyers; points them to the member area |
| `assets/config.js` | **The one file to edit**: email, Supabase URL and anon key, every price and its copy |
| `assets/links.js` | Stripe Payment Links (written by the Stripe script) |
| `assets/site.css`, `site.js`, `members.js` | Shared design and behaviour; no edits needed |
| `supabase/migrations/…_core_kit.sql` | Tables and row-level security: purchases, kit_modules, intake, ai_messages |
| `supabase/seed.sql` | Starter member-area content for every track; replace the [Nick] placeholders |
| `supabase/functions/stripe-webhook` | Records purchases and invites buyers |
| `supabase/functions/kit-assistant` | The AI partner: Claude, grounded in each member's intake |
| `stripe/create-catalog.sh`, `catalog.json` | Creates or reuses all 14 prices, Payment Links, and the webhook |
| `STRIPE-CODES.md` | Every Stripe code and how purchases unlock content |

Untouched and still needed from your current repo: `/writing/`, `/img/`, `the-pace.html`, `peakingwaters.html`, `yskaipe.html`, `fairrateindex.html`.

## Setup, in order

**1. Supabase project** (supabase.com, free tier is fine to start)

```bash
npm i -g supabase             # or: brew install supabase/tap/supabase
supabase login
supabase init                 # in the repo root, once
supabase link --project-ref YOUR-PROJECT-REF
supabase db push              # runs the migration
```

Then paste `supabase/seed.sql` into the dashboard's SQL editor and run it to load the starter content.

In the dashboard, under **Authentication, URL Configuration**, set Site URL to `https://nickconenna.com` and add `https://nickconenna.com/members.html` as a redirect URL.

**2. Functions and secrets**

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-... SITE_URL=https://nickconenna.com SITE_ORIGIN=https://nickconenna.com STRIPE_SECRET_KEY=sk_test_...
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy kit-assistant
```

Optional: `ANTHROPIC_MODEL` (default `claude-sonnet-5`) and `DAILY_LIMIT` (questions per member per day, default 40).

**3. Stripe, in test mode first**

```bash
STRIPE_SECRET_KEY=sk_test_... WEBHOOK_URL=https://YOUR-PROJECT-REF.supabase.co/functions/v1/stripe-webhook ./stripe/create-catalog.sh
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...   # printed by the script
```

**4. Site config.** In `assets/config.js`, add `supabaseUrl` and `supabaseAnonKey` (Project Settings, API) and confirm email and prices.

**5. Test the whole loop.** Buy the Core Kit with card 4242 4242 4242 4242, open the invite email, sign in, fill in the intake, and ask the AI partner a question.

**6. Go live.** Re-run step 3 with `sk_live_`, set the live `STRIPE_SECRET_KEY` and new `STRIPE_WEBHOOK_SECRET` in Supabase, then push:

```bash
git add -A && git commit -m "Core Kit on Supabase + Claude: member area, AI partner, Stripe" && git push
```

## Running it

- **Add or edit kit content** in Supabase's table editor, `kit_modules`. Set `required_key` to the purchase that unlocks it and `track` to `all` or one track.
- **See who bought what** in `purchases`. **Read intakes** in `intake` before kickoff calls.
- **Costs:** Supabase free tier covers early members; the AI partner bills to your Anthropic account per question, capped by `DAILY_LIMIT`.
- Every Buy button falls back to an email to you until its Stripe link exists, so nothing is ever a dead end.

## Cart checkout and instant delivery (Oct 1, 2026)

The add-on builder is now a real cart: everything picked goes into one Stripe Checkout, and the buyer lands signed in to their member area seconds after paying.

```bash
supabase db push                                          # adds checkout_claims + user_id_by_email
supabase functions deploy create-checkout --no-verify-jwt
supabase functions deploy claim-order --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt  # now shares _shared/fulfill.ts
```

No new secrets: they reuse STRIPE_SECRET_KEY, SITE_URL, and SITE_ORIGIN.
In Stripe, add `checkout.session.async_payment_succeeded` to the webhook's events.

How it works: create-checkout prices the cart from Stripe lookup keys (deposits for builds, monthly items make it a subscription checkout). The thanks page calls claim-order, which records the purchase immediately, prefills intake from the configurator answers, and returns a one-time sign-in link. Each session can be claimed once, within 2 hours. The webhook still records everything, so nothing depends on the buyer staying on the page. Single-item Payment Links in assets/links.js remain as the fallback.
