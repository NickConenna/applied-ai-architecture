// Rebuilds stripe/catalog.json from the prices in assets/config.js.
// Run from the repo root:  node stripe/build-catalog.js
const fs = require("fs");
global.window = {};
eval(fs.readFileSync("assets/config.js", "utf8"));
const out = [];
for (const [key, it] of Object.entries(window.SITE.catalog)) {
  const amount = it.deposit ?? it.price;
  if (amount == null) continue;
  const isDeposit = it.deposit != null;
  out.push({
    lookup_key: key,
    product: it.name + (isDeposit ? " (deposit)" : ""),
    description: isDeposit ? `Deposit to start ${it.name}. Balance invoiced on delivery.`
      : (it.text || "Core Kit: a working business setup baselined to your industry, delivered in a private member area with an AI partner."),
    amount_usd: amount,
    recurring: it.unit === "/mo" ? "month" : null,
    public_link: !it.apply,
    group: it.group,
  });
}
fs.writeFileSync("stripe/catalog.json", JSON.stringify(out, null, 2));
console.log(`${out.length} prices ready:`);
out.forEach(r => console.log(`  ${r.lookup_key.padEnd(26)} $${r.amount_usd}${r.recurring ? "/mo" : ""}`));
