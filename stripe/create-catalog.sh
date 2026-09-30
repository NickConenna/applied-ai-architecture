#!/usr/bin/env bash
# Creates (or reuses) every Stripe product, price, and Payment Link the site needs,
# then writes assets/links.js so the Buy buttons go live.
#
#   Test first:  STRIPE_SECRET_KEY=sk_test_... ./stripe/create-catalog.sh
#   Then live:   STRIPE_SECRET_KEY=sk_live_... ./stripe/create-catalog.sh
#
# Add WEBHOOK_URL=https://YOUR-PROJECT.supabase.co/functions/v1/stripe-webhook
# to also register the webhook that unlocks the member area (prints its secret once).
#
# Safe to re-run: any price that already has the lookup key is reused, and any
# link already in stripe/links.<mode>.json is kept. Needs curl and jq.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${STRIPE_SECRET_KEY:?Set STRIPE_SECRET_KEY (sk_test_... or sk_live_...)}"
SITE_URL="${SITE_URL:-https://nickconenna.com}"
MODE=$([[ "$STRIPE_SECRET_KEY" == sk_live_* ]] && echo live || echo test)
STORE="stripe/links.$MODE.json"
[[ -f "$STORE" ]] || echo '{}' > "$STORE"
API="https://api.stripe.com/v1"
s() { curl -sS -u "$STRIPE_SECRET_KEY:" "$@"; }

echo "Stripe mode: $MODE"
count=$(jq length stripe/catalog.json)
for i in $(seq 0 $((count-1))); do
  row=$(jq -c ".[$i]" stripe/catalog.json)
  key=$(jq -r .lookup_key <<<"$row")
  name=$(jq -r .product <<<"$row")
  desc=$(jq -r .description <<<"$row")
  cents=$(( $(jq -r .amount_usd <<<"$row") * 100 ))
  every=$(jq -r '.recurring // empty' <<<"$row")
  public=$(jq -r .public_link <<<"$row")

  price=$(s -G "$API/prices" -d "lookup_keys[]=$key" -d active=true | jq -r '.data[0].id // empty')
  if [[ -z "$price" ]]; then
    prod=$(s "$API/products" -d "name=$name" -d "description=$desc" -d "metadata[lookup_key]=$key" | jq -r .id)
    args=(-d "product=$prod" -d "currency=usd" -d "unit_amount=$cents" -d "lookup_key=$key" -d "nickname=$name")
    [[ -n "$every" ]] && args+=(-d "recurring[interval]=$every")
    price=$(s "$API/prices" "${args[@]}" | jq -r .id)
    echo "  created  $key  $price"
  else
    echo "  reused   $key  $price"
  fi

  [[ "$public" == "true" ]] || { echo "           (no public link: invoice after acceptance)"; continue; }
  link=$(jq -r --arg k "$key" '.[$k] // empty' "$STORE")
  if [[ -z "$link" ]]; then
    link=$(s "$API/payment_links" \
      -d "line_items[0][price]=$price" -d "line_items[0][quantity]=1" \
      -d "allow_promotion_codes=true" -d "billing_address_collection=auto" \
      $([[ -z "$every" ]] && echo '-d customer_creation=always') \
      -d "after_completion[type]=redirect" \
      -d "after_completion[redirect][url]=$SITE_URL/thanks.html?item=$key" \
      -d "metadata[lookup_key]=$key" | jq -r .url)
    tmp=$(mktemp); jq --arg k "$key" --arg v "$link" '.[$k]=$v' "$STORE" > "$tmp" && mv "$tmp" "$STORE"
    echo "           link  $link"
  fi
done

if [[ -n "${WEBHOOK_URL:-}" ]]; then
  existing=$(s -G "$API/webhook_endpoints" -d limit=100 | jq -r --arg u "$WEBHOOK_URL" '.data[] | select(.url==$u) | .id' | head -1)
  if [[ -z "$existing" ]]; then
    secret=$(s "$API/webhook_endpoints" -d "url=$WEBHOOK_URL" \
      -d "enabled_events[]=checkout.session.completed" -d "enabled_events[]=customer.subscription.deleted" \
      -d "description=nickconenna.com member area" | jq -r .secret)
    echo "Webhook created. Set this in Supabase now (shown only once):"
    echo "  supabase secrets set STRIPE_WEBHOOK_SECRET=$secret"
  else
    echo "Webhook already exists ($existing). Its secret is in the Stripe Dashboard if you need it again."
  fi
fi

{
  echo "/* Written by stripe/create-catalog.sh ($MODE mode, $(date -u +%F)). */"
  echo -n "window.SITE_LINKS = "; jq . "$STORE"; echo ";"
} > assets/links.js
echo "Wrote assets/links.js with $MODE-mode links."
[[ "$MODE" == test ]] && echo "Test links take test cards only (4242 4242 4242 4242). Re-run with sk_live_ before you deploy."
