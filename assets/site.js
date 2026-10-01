/* Shared behaviour for every page. No edits needed here: change assets/config.js. */
(function(){
  const S = window.SITE || {}, L = window.SITE_LINKS || {}, C = S.catalog || {};
  const $ = q => document.querySelector(q), $$ = q => [...document.querySelectorAll(q)];
  const money = n => "$" + Number(n).toLocaleString();
  const mail = (subject, body) => `mailto:${S.email}?subject=${encodeURIComponent(subject)}` + (body ? `&body=${encodeURIComponent(body)}` : "");

  /* One Stripe Checkout for the whole cart (supabase/functions/create-checkout). */
  async function checkout(keys, btn, fallback) {
    const label = btn.textContent;
    btn.textContent = "Opening secure checkout..."; btn.setAttribute("aria-busy", "true");
    try {
      if (!S.supabaseUrl) throw new Error("no backend");
      const r = await fetch(`${S.supabaseUrl}/functions/v1/create-checkout`, {
        method: "POST",
        headers: { "content-type": "application/json", apikey: S.supabaseAnonKey, Authorization: `Bearer ${S.supabaseAnonKey}` },
        body: JSON.stringify({ items: keys, track: state.key, where: state.where, stage: state.stage, goal: state.goal })
      });
      const d = await r.json();
      if (!r.ok || !d.url) throw new Error(d.error || "checkout");
      location.href = d.url;
    } catch (e) {
      console.warn("Checkout fell back:", e.message);
      btn.textContent = label; btn.removeAttribute("aria-busy");
      location.href = fallback;
    }
  }
  const dueNow = it => it.deposit ? it.deposit : (it.price || 0);

  const priceText = it => {
    if (!it) return "";
    if (it.price == null) return it.apply ? "By application" : "Quoted per target";
    return (it.unit === "from" ? "From " : "") + money(it.price) + (it.unit === "/mo" ? " a month" : "");
  };
  const depositText = it => it && it.deposit ? `${money(it.deposit)} to start, balance on delivery` : "";

  /* prices and buy links anywhere on the page */
  $$("[data-key]").forEach(el => {
    const it = C[el.dataset.key]; if (!it) return;
    if (el.dataset.show === "price") el.textContent = priceText(it);
    else if (el.dataset.show === "amount") el.textContent = it.price != null ? money(it.price) : "";
    else if (el.dataset.show === "deposit") el.textContent = depositText(it);
  });
  $$("[data-buy]").forEach(a => {
    const k = a.dataset.buy, it = C[k] || {};
    a.href = L[k] || mail(it.name ? `${it.name}` : "Question", "");
    if (L[k]) a.rel = "noopener";
  });

  /* email, booking, social, extras */
  $$("[data-mail]").forEach(a => a.href = mail(a.dataset.mail || "Hello"));
  $$('[data-link="booking"]').forEach(a => { a.href = S.booking || mail("20 minutes?"); });
  $$('[data-link="youtube"]').forEach(a => { if (S.youtube) a.href = S.youtube; else a.closest("li")?.remove(); });
  const g = $("#guarantee"); if (g && S.guarantee) g.textContent = S.guarantee;
  if (S.quote && S.quote.text && $("#voice")) {
    $("#quote-text").textContent = "\u201C" + S.quote.text + "\u201D";
    $("#quote-by").textContent = S.quote.by; $("#voice").hidden = false;
  }
  const f = $("#signup");
  if (f) { if (S.buttondown) f.action = S.buttondown;
    else f.addEventListener("submit", e => { e.preventDefault(); location.href = mail("Add me to the build log", $("#email").value); }); }
  $$(".view img").forEach(img => { const off = () => img.style.visibility = "hidden";
    if (img.complete && !img.naturalWidth) off(); else img.addEventListener("error", off); });

  /* video dialog */
  const dlg = $("#player"), slot = $("#player-slot");
  if (dlg) {
    $$("[data-video]").forEach(b => { const src = (S.videos || {})[b.dataset.video]; if (!src) return; b.hidden = false;
      b.addEventListener("click", () => {
        slot.innerHTML = /\.mp4($|\?)/.test(src) ? `<video src="${src}" controls autoplay playsinline></video>`
          : `<iframe src="${src}" allow="autoplay; fullscreen" allowfullscreen title="Demo video"></iframe>`;
        $("#player-title").textContent = b.closest(".tile")?.querySelector("h2")?.textContent || "Demo"; dlg.showModal(); }); });
    const close = () => { slot.innerHTML = ""; dlg.close(); };
    $("#player-close").addEventListener("click", close);
    dlg.addEventListener("click", e => { if (e.target === dlg) close(); });
  }

  /* ---------- Core Kit configurator (index) ---------- */
  const TRACKS = {
    service:   { label:"Local service", title:"Your service business kit",
      incl:[["Quote-and-book website","Instant fair-price quotes, online booking, card deposits"],["Local pricing baseline","From real labor and material data for your area"],["Confirmation and reminder emails","Sent automatically on every booking"],["First-ten-customers script","Neighbors, local groups, and repeat work"]] },
    products:  { label:"Products online", title:"Your online shop kit",
      incl:[["Shop page and checkout","Card payments, ready for your first product"],["Pricing baseline","Standard margins and costs for what you sell"],["Email list and free sample","Grows your audience before you launch"],["Launch-week posting plan","What to post, where, and when"]] },
    food:      { label:"Food and drink", title:"Your food business kit",
      incl:[["Menu and preorder page","Take orders and payment ahead of pickup"],["Menu pricing baseline","Standard food-cost and margin targets"],["Pickup and pop-up schedule","Markets, events, and weekly drops"],["Licensing checklist","The permits to ask your local office about"]] },
    publishing:{ label:"Publishing", title:"Your publishing kit",
      incl:[["Manuscript-to-Amazon pipeline","Structure, continuity, and formatting"],["Listing baseline","Pricing, categories, and keywords for your genre"],["Cover brief and X-Ray","Everything Amazon asks for"],["Launch copy","Description, author page, and launch posts"]] },
    app:       { label:"App or software", title:"Your software starter kit",
      incl:[["Landing page and waitlist","Test demand before you build"],["Product baseline","Standard pricing models for your kind of app"],["Clickable prototype plan","The screens that prove the idea"],["First-users playbook","Where your first 50 users come from"]] },
    other:     { label:"Custom", title:"Your starter kit",
      incl:[["A working web presence","Page, checkout or signup, and email"],["Industry baseline","We match you to the closest standard setup"],["Step-by-step launch guide","Plain English, in order"],["First-customers playbook","Who to reach and what to say"]] }
  };
  const NEXT = {
    idea:   "Start with <b>Mapping</b> so the numbers work before you spend.",
    first:  "Add <b>Catalysts</b>. Early fans and honest feedback speed everything up.",
    running:"Add <b>Benchmarks</b> and pick the number you want to hit next."
  };
  const form = $("#seedform");
  let state = { t: TRACKS.service, stage:"idea", goal:"side", where:"" };
  function seed(){
    if (!form) return;
    const v = n => (form.querySelector(`input[name=${n}]:checked`) || {}).value;
    const key = v("track");
    state = { key, t: TRACKS[key], stage: v("stage"), goal: v("goal"), where: $("#where").value.trim() };
    $("#r-track").textContent = state.t.label + " track";
    $("#r-title").textContent = state.t.title;
    $("#r-where").textContent = state.where ? `Baselined to industry standards, set up for ${state.where}.` : "Baselined to industry standards for your track.";
    $("#r-incl").innerHTML = state.t.incl.map(([a,b]) => `<li>${a}<small>${b}</small></li>`).join("");
    let msg = NEXT[state.stage];
    if (key === "app") msg = "Add a <b>Web app</b> or <b>Mobile app</b> build when your waitlist says go.";
    if (state.goal === "big") msg += " Building something big? Look at <b>Journey</b>.";
    $("#r-next").innerHTML = "Recommended next: " + msg;
    const body = `Core Kit: ${state.t.label}\nWhere: ${state.where || "-"}\nStage: ${state.stage}\nGoal: ${state.goal}`;
    $("#r-buy").href = L.core_kit || mail("Core Kit: " + state.t.label, body);
  }
  const rb = $("#r-buy");
  if (rb) rb.addEventListener("click", e => { e.preventDefault(); checkout(["core_kit"], rb, rb.href); });
  if (form) {
    form.addEventListener("input", () => { seed(); stack(); });
    $$("[data-track]").forEach(a => a.addEventListener("click", () => {
      const r = document.getElementById("t-" + a.dataset.track); if (r) { r.checked = true; seed(); stack(); } }));
  }

  /* ---------- Add-on builder (index) ---------- */
  const grid = $("#ao-grid");
  const GROUPS = [["grow","Grow","Get customers and keep them"],["plan","Plan","Know the numbers, hit the numbers"],["build","Build","Web, app, and AI development"]];
  function stack(){
    if (!grid) return;
    const picked = $$("#ao-grid input:checked").map(i => i.value);
    const all = picked.includes("journey_deposit");
    const items = picked.filter(k => k !== "journey_deposit").map(k => [k, C[k]]);
    let once = C.core_kit.price, monthly = 0, quoted = [], from = false;
    items.forEach(([k,it]) => { if (it.price == null) quoted.push(it.name); else if (it.unit === "/mo") monthly += it.price; else { once += it.price; if (it.unit === "from") from = true; } });
    const tot = all ? "Apply" : (from ? "From " : "") + money(once) + (monthly ? ` + ${money(monthly)}/mo` : "") + (quoted.length ? " + quote" : "");
    $("#st-title").textContent = "Core Kit" + (state.t ? `, ${state.t.label}` : "");
    $("#st-list").textContent = all ? "Journey: all in" : (items.length ? "+ " + items.map(([,it]) => it.name).join(", ") : "Nothing added yet");
    const due = C.core_kit.price + items.reduce((n, [, it]) => n + dueNow(it), 0);
    const showDue = !all && (from || monthly || quoted.length || items.some(([, it]) => it.deposit));
    $("#st-tot").innerHTML = tot + (showDue ? `<small class="due">${money(due)} due today</small>` : "");
    $("#st-go").textContent = all ? "Apply for Journey" : "Check out";
    cart = all ? null : ["core_kit", ...items.map(([k]) => k)];
    const body = `Core Kit: ${state.t ? state.t.label : "-"}\nWhere: ${state.where || "-"}\nStage: ${state.stage}\nGoal: ${state.goal}\nAdd-ons: ${all ? "Journey (all in)" : (items.map(([,it]) => it.name).join(", ") || "none")}\nEstimate: ${tot}\n\nAbout my business:\n`;
    $("#st-go").href = all ? mail("Journey application", body) : (!items.length && L.core_kit ? L.core_kit : mail("My Core Kit plan", body));
  }
  let cart = null;
  const go = $("#st-go");
  if (go) go.addEventListener("click", e => { if (!cart) return; e.preventDefault(); checkout(cart, go, go.href); });
  window.addEventListener("pageshow", () => { seed(); stack(); }); // reset button labels after Back from Stripe
  if (grid) {
    const card = (k,it,cls="") => `<label class="ao ${cls}"><input type="checkbox" value="${k}">
      <div class="top"><h3>${it.name}</h3><span class="tick" aria-hidden="true"></span></div>
      <p class="kind">${it.kind}</p><p>${it.text}</p>
      <span class="cost">${priceText(it)}${it.deposit && !it.apply ? `<span class="dep">${money(it.deposit)} to start</span>` : ""}</span></label>`;
    let html = "";
    GROUPS.forEach(([g,title,sub]) => {
      const list = Object.entries(C).filter(([,it]) => it.group === g); if (!list.length) return;
      html += `<div class="ao-group"><h3>${title}</h3><span>${sub}</span></div>` + list.map(([k,it]) => card(k,it)).join("");
    });
    const j = Object.entries(C).find(([,it]) => it.group === "journey");
    if (j) html += `<div class="ao-group"><h3>All in</h3><span>Everything, together</span></div>` + card(j[0], j[1], "all");
    grid.innerHTML = html;
    grid.addEventListener("change", stack);
  }
  seed(); stack();

  /* ---------- thanks page ---------- */
  const th = $("#thanks");
  const sid = new URLSearchParams(location.search).get("session_id");
  if (th && sid && S.supabaseUrl) {
    $("#th-item-wrap").hidden = true;
    $("#th-steps").innerHTML = "<li>Opening your member area...</li>";
    fetch(`${S.supabaseUrl}/functions/v1/claim-order`, {
      method: "POST",
      headers: { "content-type": "application/json", apikey: S.supabaseAnonKey, Authorization: `Bearer ${S.supabaseAnonKey}` },
      body: JSON.stringify({ session_id: sid })
    }).then(r => r.json()).then(d => {
      if (d.keys) { $("#th-item").textContent = d.keys.map(k => (C[k] || {}).name || k).join(", "); $("#th-item-wrap").hidden = false; }
      if (d.link) { location.replace(d.link); return; }
      $("#th-steps").innerHTML = ["Stripe emails your receipt now.",
        `Your purchase is recorded${d.email ? " for " + d.email.replace(/</g, "") : ""}. Sign in at the member area with that email for a one-tap link.`]
        .map(x => `<li>${x}</li>`).join("");
    }).catch(() => {
      $("#th-steps").innerHTML = "<li>Stripe emails your receipt now.</li><li>Check your inbox for a sign-in link to your member area.</li>";
    });
  } else if (th) {
    const key = new URLSearchParams(location.search).get("item") || "";
    const it = C[key];
    if (it) $("#th-item").textContent = it.name;
    const first = "Check your inbox for a sign-in link to your private member area. It uses the email you paid with.";
    const steps = key.startsWith("core_kit") ? ["Stripe emails your receipt now.", first, "Fill in the five-minute intake, and your kit and AI partner are set up for your business."]
      : key.includes("monthly") ? ["Stripe emails your receipt now.", first, "Within one business day I send a calendar link for your first session."]
      : key.startsWith("build_") || key.startsWith("studio_") || key.startsWith("journey") ? ["Stripe emails your receipt now.", first, "Within one business day I email to schedule kickoff. Project updates live in your member area."]
      : ["Stripe emails your receipt now.", first, "Your add-on's next steps are waiting inside."];
    $("#th-steps").innerHTML = steps.map(s => `<li>${s}</li>`).join("");
  }
})();
