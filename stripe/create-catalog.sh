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
# Safe to re-run, and the way to change prices: edit assets/config.js, rebuild
# stripe/catalog.json, run this again. Unchanged prices are left alone; changed ones
# get a new Stripe price and Payment Link, and the old ones are archived.
# Promotions don't need any of this: create a coupon + promotion code in Stripe,
# every link already accepts codes. Needs curl and jq.
set -euo pipefail
cd "$(dirname "$0")/.."

: "${STRIPE_SECRET_KEY:?Set STRIPE_SECRET_KEY (sk_test_... or sk_live_...)}"
SITE_URL="${SITE_URL:-https://nickconenna.com}"
MODE=$([[ "$STRIPE_SECRET_KEY" == *_live_* ]] && echo live || echo test)
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

  existing=$(s -G "$API/prices" -d "lookup_keys[]=$key" -d active=true)
  price=$(jq -r '.data[0].id // empty' <<<"$existing")
  old_amt=$(jq -r '.data[0].unit_amount // empty' <<<"$existing")
  old_every=$(jq -r '.data[0].recurring.interval // empty' <<<"$existing")
  prod=$(jq -r '.data[0].product // empty' <<<"$existing")

  new_price() {
    local args=(-d "product=$prod" -d "currency=usd" -d "unit_amount=$cents" -d "lookup_key=$key" -d "transfer_lookup_key=true" -d "nickname=$name")
    [[ -n "$every" ]] && args+=(-d "recurring[interval]=$every")
    s "$API/prices" "${args[@]}" | jq -r .id
  }

  if [[ -z "$price" ]]; then
    prod=$(s "$API/products" -d "name=$name" -d "description=$desc" -d "metadata[lookup_key]=$key" | jq -r .id)
    price=$(new_price)
    echo "  created  $key  \$$((cents/100))"
  elif [[ "$old_amt" != "$cents" || "$old_every" != "$every" ]]; then
    # Price changed in config.js: new price takes over the lookup key, old one is archived,
    # and the old Payment Link is switched off so a fresh one is made below.
    old_price=$price
    price=$(new_price)
    s "$API/prices/$old_price" -d active=false >/dev/null
    old_link_id=$(jq -r --arg k "$key" '.["_id_" + $k] // empty' "$STORE")
    [[ -n "$old_link_id" ]] && s "$API/payment_links/$old_link_id" -d active=false >/dev/null
    tmp=$(mktemp); jq --arg k "$key" 'del(.[$k]) | del(.["_id_" + $k])' "$STORE" > "$tmp" && mv "$tmp" "$STORE"
    echo "  updated  $key  \$$((old_amt/100)) -> \$$((cents/100))"
  else
    echo "  same     $key  \$$((cents/100))"
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
      -d "metadata[lookup_key]=$key")
    link_id=$(jq -r .id <<<"$link"); link=$(jq -r .url <<<"$link")
    tmp=$(mktemp); jq --arg k "$key" --arg v "$link" --arg i "$link_id" '.[$k]=$v | .["_id_" + $k]=$i' "$STORE" > "$tmp" && mv "$tmp" "$STORE"
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
  echo -n "window.SITE_LINKS = "; jq 'with_entries(select(.key | startswith("_id_") | not))' "$STORE"; echo ";"
} > assets/links.js
echo "Wrote assets/links.js with $MODE-mode links."
[[ "$MODE" == test ]] && echo "Test links take test cards only (4242 4242 4242 4242). Re-run with sk_live_ before you deploy."
