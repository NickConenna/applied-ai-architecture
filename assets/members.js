/* Member area: Supabase sign-in, gated kit content, intake, and the Claude AI partner.
   Data access is enforced by row-level security in supabase/migrations, not by this file. */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const S = window.SITE || {}, L = window.SITE_LINKS || {}, C = S.catalog || {};
const $ = q => document.querySelector(q);
const root = $("#members");
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

/* tiny, safe markdown: paragraphs, **bold**, - lists, [text](https://link) */
function md(src) {
  const inline = t => esc(t)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return String(src || "").trim().split(/\n{2,}/).map(block => {
    const lines = block.split("\n");
    if (lines.every(l => /^\s*[-*] /.test(l))) return "<ul>" + lines.map(l => `<li>${inline(l.replace(/^\s*[-*] /, ""))}</li>`).join("") + "</ul>";
    return `<p>${lines.map(inline).join("<br>")}</p>`;
  }).join("");
}
const embed = url => !url ? "" : /\.mp4($|\?)/.test(url)
  ? `<video src="${esc(url)}" controls playsinline></video>`
  : `<iframe src="${esc(url)}" allow="fullscreen" allowfullscreen title="Video"></iframe>`;

if (!S.supabaseUrl || !S.supabaseAnonKey) {
  root.innerHTML = `<div class="m-card m-login"><h1 class="title" style="font-size:32px">Member area</h1>
    <p class="m-note">Almost ready. Add your Supabase URL and anon key to assets/config.js to switch on sign-in.</p></div>`;
} else {
  const sb = createClient(S.supabaseUrl, S.supabaseAnonKey);
  sb.auth.onAuthStateChange((_e, session) => render(session));
  sb.auth.getSession().then(({ data }) => render(data.session));

  let rendered = null;
  async function render(session) {
    const id = session?.user?.id || "out";
    if (rendered === id) return; rendered = id;
    if (!session) return login();
    return dashboard(session.user);
  }

  function login() {
    root.innerHTML = `<div class="m-card m-login">
      <h1 class="title" style="font-size:36px">Sign in</h1>
      <p class="m-note">Use the email you paid with. We'll send you a one-tap sign-in link. No password.</p>
      <form id="login"><label class="vh" for="m-email">Email</label>
        <input id="m-email" type="email" required autocomplete="email" placeholder="you@email.com">
        <button class="pill" type="submit">Email me a sign-in link</button></form>
      <p class="m-note" id="login-msg" aria-live="polite"></p>
      <p class="m-note">Not a member yet? <a href="/#seed">Build your Core Kit</a>.</p></div>`;
    $("#login").addEventListener("submit", async e => {
      e.preventDefault();
      const email = $("#m-email").value.trim();
      $("#login-msg").textContent = "Sending...";
      const { error } = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: location.origin + "/members.html" } });
      $("#login-msg").textContent = error ? "That didn't send. Check the address and try again." : "Check your inbox for the sign-in link.";
    });
  }

  async function dashboard(user) {
    root.innerHTML = `<p class="m-note">Loading your kit...</p>`;
    const [{ data: buys }, { data: mods }, { data: intake }, { data: base0 }, { data: note }] = await Promise.all([
      sb.from("purchases").select("lookup_key, created_at").eq("active", true).order("created_at"),
      sb.from("kit_modules").select("id, required_key, track, title, body, video_url, sort").order("sort"),
      sb.from("intake").select("*").eq("user_id", user.id).maybeSingle(),
      sb.from("baselines").select("*").eq("user_id", user.id).maybeSingle(),
      sb.from("baseline_notes").select("note").eq("user_id", user.id).maybeSingle()
    ]);
    const owned = [...new Set((buys || []).map(b => b.lookup_key))];
    const track = intake?.track || "all";
    const modules = (mods || []).filter(m => m.track === "all" || m.track === track);
    const upsell = Object.entries(C).filter(([k, it]) => !owned.includes(k) && L[k] && !["studio","journey"].includes(it.group) && k !== "core_kit");
    const pre = url => url + (url.includes("?") ? "&" : "?") + "prefilled_email=" + encodeURIComponent(user.email);

    root.innerHTML = `
      <div class="m-top"><div><p class="eyebrow" style="font-size:17px">Member area</p><h1>${intake?.business_name ? "Welcome, " + esc(intake.business_name).replace(/\.$/, "") + "." : "Welcome."}</h1></div>
        <button class="pill ghost" id="signout" type="button">Sign out</button></div>
      <div class="m-grid">
        <div>
          <div class="m-card"><h2>Your kit</h2>
            ${owned.length ? `<div class="owned">${owned.map(k => `<span>${esc(C[k]?.name || k)}</span>`).join("")}</div>`
              : `<p class="m-empty">No purchases on ${esc(user.email)} yet. If you paid with a different email, sign in with that one, or <a href="/#seed">get your Core Kit</a>.</p>`}
          </div>
          <div class="m-card"><h2>Your steps</h2>
            <p class="hint">${intake ? "Matched to your answers. Change them any time on the right." : "Fill in the intake on the right and your steps match your business."}</p>
            ${modules.length ? modules.map(m => `<article class="module"><h3>${esc(m.title)}</h3><div class="body">${md(m.body)}</div>${embed(m.video_url)}</article>`).join("")
              : `<p class="m-empty">Your steps appear here once your purchase is linked to this email.</p>`}
          </div>
          ${owned.includes("core_kit") ? `<div class="m-card" id="baseline"><h2>Your baseline</h2>
            <p class="hint">${intake ? "Loading your baseline..." : "Save \"About your business\" on the right and your baseline appears here."}</p></div>` : ""}
        </div>
        <div>
          <div class="m-card"><h2>Your AI partner</h2>
            <p class="hint">Claude, set up with your intake. Ask about pricing, first customers, what to do this week.</p>
            <div class="chat"><div class="chat-log" id="log" aria-live="polite"></div>
              <form id="ask" class="m-form"><label class="vh" for="q">Your question</label>
                <textarea id="q" placeholder="What should I do first this week?" ${owned.length ? "" : "disabled"}></textarea>
                <button class="pill" type="submit" ${owned.length ? "" : "disabled"}>Ask</button></form></div>
          </div>
          <div class="m-card"><h2>About your business</h2>
            <p class="hint">Your answers shape your steps and your AI partner.</p>
            <form class="m-form" id="intake">
              <label>Business name<input name="business_name" value="${esc(intake?.business_name)}"></label>
              <label>What are you starting?<select name="track">
                ${[["service","Local service"],["products","Products online"],["food","Food and drink"],["publishing","Publishing"],["app","App or software"],["other","Something else"]]
                  .map(([v,t]) => `<option value="${v}" ${intake?.track === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
              <label>Where are you based?<input name="location" value="${esc(intake?.location)}" placeholder="City or ZIP"></label>
              <label>Where are you now?<select name="stage">
                ${[["idea","Just an idea"],["first","First customers"],["running","Already running"]].map(([v,t]) => `<option value="${v}" ${intake?.stage === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
              <label>What's the goal?<select name="goal">
                ${[["side","Side income"],["full","Full-time living"],["big","Build something big"]].map(([v,t]) => `<option value="${v}" ${intake?.goal === v ? "selected" : ""}>${t}</option>`).join("")}</select></label>
              <label>Tell us about it, your way<textarea name="about" placeholder="What you sell, who it's for, what you want it to become">${esc(intake?.about)}</textarea></label>
              <button class="pill" type="submit">Save</button><p class="m-note" id="intake-msg" aria-live="polite"></p>
            </form>
          </div>
          ${upsell.length ? `<div class="m-card"><h2>Grow it further</h2><div class="up-list">
            ${upsell.map(([k,it]) => `<a href="${esc(pre(L[k]))}">${esc(it.name)}<span>${it.unit === "/mo" ? "$" + it.price + "/mo" : it.deposit ? "$" + it.deposit.toLocaleString() + " to start" : "$" + it.price.toLocaleString()}</span></a>`).join("")}
          </div></div>` : ""}
        </div>
      </div>`;

    $("#signout").addEventListener("click", async () => { rendered = null; await sb.auth.signOut(); });

    if (owned.includes("core_kit") && intake?.track) baseline(user, intake, base0, note?.note || "");

    $("#intake").addEventListener("submit", async e => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(e.target));
      const { error } = await sb.from("intake").upsert({ user_id: user.id, ...f, updated_at: new Date().toISOString() });
      $("#intake-msg").textContent = error ? "Couldn't save. Try again." : "Saved.";
      if (!error) { rendered = null; dashboard(user); }
    });

    const history = [];
    const log = $("#log");
    const bubble = (role, text) => { const d = document.createElement("div"); d.className = "bubble " + (role === "user" ? "user" : "ai"); d.textContent = text; log.appendChild(d); log.scrollTop = log.scrollHeight; return d; };
    $("#ask").addEventListener("submit", async e => {
      e.preventDefault();
      const q = $("#q").value.trim(); if (!q) return;
      $("#q").value = ""; bubble("user", q); history.push({ role: "user", content: q });
      const wait = bubble("ai", "Thinking...");
      const { data, error } = await sb.functions.invoke("kit-assistant", { body: { messages: history.slice(-12) } });
      const reply = error ? "I couldn't answer just now. Try again in a minute." : data.reply;
      wait.textContent = reply;
      if (!error) history.push({ role: "assistant", content: reply });
    });
  }

  /* ---------- Your baseline: live prices, startup costs, break-even ---------- */
  async function baseline(user, intake, base, nickNote) {
    const box = $("#baseline"); if (!box) return;
    const TRACK_NAMES = { service:"Local service", products:"Products online", food:"Food and drink", publishing:"Publishing", app:"App or software", other:"Something else" };
    const fromTemplate = async track => {
      const { data: t } = await sb.from("baseline_templates").select("prices, costs").eq("track", track).maybeSingle();
      return { user_id: user.id, track, prices: t?.prices || [], costs: t?.costs || [], cost_per_sale: null, monthly_costs: null };
    };
    if (!base) {
      base = await fromTemplate(intake.track);
      const { error } = await sb.from("baselines").insert(base);
      if (error) { box.innerHTML = `<h2>Your baseline</h2><p class="m-empty">Your baseline isn't ready yet. Email me and I'll set it up.</p>`; return; }
    }
    const usd = n => n == null || n === "" || isNaN(n) ? "" : Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: Number(n) % 1 ? 2 : 0 });
    const num = v => v === "" || v == null ? null : Number(v);
    const range = p => p.low != null && p.high != null ? `${usd(p.low)} to ${usd(p.high)}` : "Coming from Nick";
    const check = p => p.yours == null || p.low == null || p.high == null ? "" :
      p.yours < p.low ? `<span class="bl-flag low">Below range</span>` : p.yours > p.high ? `<span class="bl-flag">Above range</span>` : `<span class="bl-flag ok">In range</span>`;

    function render() {
      const prices = base.prices.map((p, i) => `<tr><th scope="row">${esc(p.name)}<small>${esc(p.note)}</small></th>
        <td>${range(p)}</td>
        <td><label class="vh" for="bp${i}">Your price for ${esc(p.name)}</label><input id="bp${i}" inputmode="decimal" data-p="${i}" value="${p.yours ?? ""}" placeholder="$"></td>
        <td>${check(p)}</td></tr>`).join("");
      const costs = base.costs.map((c, i) => `<tr><th scope="row">${esc(c.item)}<small>${esc(c.cheap)}</small></th>
        <td><label class="vh" for="bc${i}">Your cost for ${esc(c.item)}</label><input id="bc${i}" inputmode="decimal" data-c="${i}" value="${c.yours ?? c.typical ?? ""}" placeholder="Varies"></td>
        <td><label class="vh" for="bn${i}">Need it?</label><select id="bn${i}" data-n="${i}">${["Now","Later","Skip"].map(o => `<option ${c.need === o ? "selected" : ""}>${o}</option>`).join("")}</select></td></tr>`).join("");
      const cost = c => c.need === "Skip" ? 0 : Number(c.yours ?? c.typical ?? 0) || 0;
      const nowTotal = base.costs.filter(c => c.need === "Now").reduce((a, c) => a + cost(c), 0);
      const laterTotal = base.costs.filter(c => c.need === "Later").reduce((a, c) => a + cost(c), 0);
      const price = base.prices[0]?.yours;
      const fee = price ? price * 0.029 + 0.3 : null;
      const keep = price ? price - (base.cost_per_sale || 0) - fee : null;
      const be = keep == null ? "" : keep <= 0 ? "Raise your price or cut your cost per sale" : (n => `${n} ${n === 1 ? "sale" : "sales"} a month`)(Math.ceil((base.monthly_costs || 0) / keep));
      const mismatch = base.track !== intake.track;

      box.innerHTML = `<h2>Your baseline</h2>
        <p class="hint">The standard setup for ${esc(TRACK_NAMES[base.track] || "your business")}${intake.location ? " in " + esc(intake.location) : ""}. Change your numbers; it saves as you go.</p>
        ${mismatch ? `<p class="bl-switch">You changed your track to ${esc(TRACK_NAMES[intake.track])}. <button class="more" type="button" id="bl-reset">Switch my baseline</button></p>` : ""}
        ${nickNote ? `<div class="bl-note"><b>From Nick</b><p>${esc(nickNote)}</p></div>` : ""}
        <h3>What do businesses like mine charge?</h3>
        <div class="bl-scroll"><table class="bl"><thead><tr><th>Offer</th><th>Standard</th><th>Your price</th><th></th></tr></thead><tbody>${prices}</tbody></table></div>
        <h3>What does it cost to open?</h3>
        <div class="bl-scroll"><table class="bl"><thead><tr><th>Item</th><th>Your cost</th><th>Need it?</th></tr></thead><tbody>${costs}</tbody></table></div>
        <p class="bl-total"><span>Needed now <b>${usd(nowTotal) || "$0"}</b></span><span>Can wait <b>${usd(laterTotal) || "$0"}</b></span></p>
        <h3>How many sales cover my costs?</h3>
        <div class="bl-be">
          <label>Your cost per sale<input inputmode="decimal" id="bl-cps" value="${base.cost_per_sale ?? ""}" placeholder="$"></label>
          <label>Your monthly costs<input inputmode="decimal" id="bl-mc" value="${base.monthly_costs ?? ""}" placeholder="$"></label>
          <p>${price ? `On a ${usd(price)} sale, the card fee is about ${usd(fee)} and you keep <b>${usd(keep)}</b>.` : "Enter your price for the first offer above to see this."}</p>
          <p class="bl-big">${be ? "Break-even: " + be : ""}</p>
        </div>
        <p class="m-note" id="bl-msg" aria-live="polite"></p>
        <p class="bl-fine">Card fee uses Stripe's standard US online rate, 2.9% + 30¢. Estimates, not tax or legal advice.</p>`;

      box.querySelectorAll("[data-p]").forEach(el => el.addEventListener("change", () => { base.prices[el.dataset.p].yours = num(el.value); save(); }));
      box.querySelectorAll("[data-c]").forEach(el => el.addEventListener("change", () => { base.costs[el.dataset.c].yours = num(el.value); save(); }));
      box.querySelectorAll("[data-n]").forEach(el => el.addEventListener("change", () => { base.costs[el.dataset.n].need = el.value; save(); }));
      $("#bl-cps").addEventListener("change", e => { base.cost_per_sale = num(e.target.value); save(); });
      $("#bl-mc").addEventListener("change", e => { base.monthly_costs = num(e.target.value); save(); });
      const reset = $("#bl-reset");
      if (reset) reset.addEventListener("click", async () => { base = await fromTemplate(intake.track); save(); });
    }

    async function save() {
      const { error } = await sb.from("baselines").upsert({ ...base, updated_at: new Date().toISOString() });
      render();
      $("#bl-msg").textContent = error ? "Couldn't save. Check your connection and try again." : "Saved.";
    }
    render();
  }
}
