# Switching to corekitai.com

Code is already updated. These settings live outside the code; do them in this order.

1. **Hosting.** Add `corekitai.com` (and `www.corekitai.com`) to the site's project at your host, and put the DNS records it gives you in at your registrar for corekitai.com. Make corekitai.com the primary domain.
2. **Keep the old address working.** Leave `nickconenna.com` on the same project, set to permanently redirect (301) to `https://corekitai.com`. Old links, sign-in emails, and search results keep working.
3. **Supabase Auth.** Authentication -> URL Configuration: Site URL `https://corekitai.com`; add `https://corekitai.com/members.html` and `https://corekitai.com/admin.html` to Redirect URLs. Keep the nickconenna.com entries until the redirect has run for a few weeks.
4. **Supabase secrets.**
   `npx supabase secrets set --project-ref vjyflheljusxvocjpnhk SITE_URL=https://corekitai.com SITE_ORIGIN=https://corekitai.com`
   then redeploy: create-checkout, stripe-webhook, claim-order (each with `--use-api --no-verify-jwt`), and kit-assistant, refresh-profile, notify-brief (each with `--use-api`).
5. **Resend.** Add and verify `corekitai.com` under Domains, then
   `npx supabase secrets set --project-ref vjyflheljusxvocjpnhk WELCOME_FROM="CoreKit AI <nick@corekitai.com>"`
6. **Stripe payment links (the fallback links in assets/links.js).** Each one's "After payment" redirect still points at nickconenna.com/thanks.html. The 301 keeps them working; update them to corekitai.com when convenient (Payment links -> each link -> After payment).
7. **Test** one coupon purchase end to end on corekitai.com.
