#!/usr/bin/env bash
# Adds Privacy, Terms, and Refunds links to the footer of every page that has the site footer.
# Safe to run more than once.
for f in index.html build.html members.html thanks.html privacy.html terms.html refunds.html; do
  [[ -f "$f" ]] || continue
  grep -q 'href="/privacy.html">Privacy' "$f" && continue
  perl -0pi -e 's|(<a href="https://x.com/BitcoinBroham">X</a>)(\s*</nav>\s*</div>\s*</footer>)|$1\n      <a href="/privacy.html">Privacy</a>\n      <a href="/terms.html">Terms</a>\n      <a href="/refunds.html">Refunds</a>$2|' "$f"
  grep -q 'href="/privacy.html">Privacy' "$f" && echo "updated $f" || echo "footer not found in $f"
done
