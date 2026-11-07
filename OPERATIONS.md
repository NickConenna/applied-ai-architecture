# CoreKit AI operations

The site sells, captures leads, and runs scans on its own. Nick handles approvals, sales calls, exceptions, and contract work. Everything else is a routine.

Optional env var: `SCAN_MODEL` (default claude-sonnet-5-5).

## Decisions (Nov 7, 2026)

| Area | Decision |
| --- | --- |
| Brand | CoreKit AI at corekitai.com, led by Nick Conenna. Used for personal outreach to targets. |
| Buyer | PE operating partners and deal teams; portfolio company CEOs, COOs, CFOs; owners and CEOs of independent mid-market companies. Charlotte first, US-wide remote. |
| Industries | Healthcare services, business services, industrial and distribution, each with its own page. Match the page to the prospect in every email. |
| Expansion | Charlotte until 2 to 3 results, then Atlanta, Raleigh-Durham, Nashville; then NY, Chicago, Dallas. |
| Offer | Company diagnostic $6,000 (credited to build). Value creation build from $25,000. Portfolio AI partner from $15,000/mo. AI diligence from $10,000. |
| Playbook | Diagnose, build, measure against baseline, roll out across the portfolio. |
| Leave-behind | /brief.html, printed or saved as PDF. |
| Lead engine | Portfolio company AI scan at /scan.html; every scan is a lead in Supabase `leads`. |
| Scheduler | Cal.com free, one 20-minute event. Link goes in `BOOKING_URL` in index, scan, how-we-build. |
| Outreach | By hand, each week: 3 PE operating partners, 5 portfolio-company executives, 5 owner-led company CEOs, plus one Charlotte AI meetup. |
| First target | One signed diagnostic within 30 days. |

## One-time setup

1. Supabase: run `supabase/leads.sql` in the SQL editor of the CoreKit project (skip if already run).
2. Vercel > Project > Settings > Environment Variables, add:
   - `ANTHROPIC_API_KEY` (required)
   - `SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (logs leads)
   - `RESEND_API_KEY`, `RESEND_FROM` like `CoreKit AI <hello@corekitai.com>` (domain verified in Resend)
3. Vercel > Settings > Functions: max duration at least 60 seconds.
4. Anthropic Console: set a monthly spend limit.
5. Run one scan yourself and confirm the email arrives and the lead row appears.

## Daily (15 minutes)

- Read every new scan in `leads`. Reply personally within 24 hours with one specific thought on their best opportunity.
- Outreach: personal notes to PE operating partners and portfolio-company executives, with corekitai.com and the brief. Reply to every response same day.
- Exceptions inbox for live clients.

## Weekly loop (Monday, 45 minutes)

Write the numbers, pick one fix, ship it by Friday.

| Metric | This week | Last week |
| --- | --- | --- |
| Scans run | | |
| Calls booked | | |
| Calls to clients (%) | | |
| New revenue (diagnostics, builds, embedded) | | |
| Pipeline value (scoped, not signed) | | |
| Replies by buyer type (sponsor, PE-backed exec, owner-led CEO) and industry | | |

Rules for picking the one fix:
- Scans low: change the homepage headline or scan CTA, or post an anonymized scan result on LinkedIn.
- Scans high, calls low: change the scan results call to action or your follow-up reply.
- Calls high, signed work low: tighten the diagnostic pitch and the written scope, not the site.
- One buyer type replies most: double its share of outreach next week.

Friday: post one note on LinkedIn about where AI moves margin in a specific function, linking to corekitai.com.

## Monthly

- Send every embedded client a written summary of what shipped and what it changed.
- Revisit open scans older than 30 days with one new idea; that's a reason to reach out.
- Review pricing against close rate. If more than half of scoped proposals sign, raise prices.
