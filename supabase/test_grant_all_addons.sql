-- TESTING ONLY: give one account every add-on at no charge, so you can try them all.
-- Change the email, run in the SQL Editor. Remove with the block at the bottom.
insert into public.purchases (email, lookup_key, amount_cents, currency, stripe_session_id, active)
select 'nick@peakingwaters.com', k, 0, 'usd', 'test_grant', true
from unnest(array['core_kit','addon_catalysts','addon_brand','addon_crew_monthly','addon_mapping','addon_benchmarks_deposit',
                  'build_customization','build_website_deposit','build_webapp_deposit','build_mobile_deposit','build_agent_deposit',
                  'studio_discovery','studio_retainer_monthly']) as k
on conflict (stripe_session_id, lookup_key) do nothing;

-- To remove the test grants later (your real purchases stay):
-- delete from public.purchases where stripe_session_id = 'test_grant';
