/* Admin: every member's intake and baseline, standard ranges, and your note.
   Access is enforced in the database (public.admins + is_admin()), not by this file. */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const S = window.SITE || {};
const $ = q => document.querySelector(q);
const root = $("#admin");
const esc = t => String(t ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const usd = n => n == null || n === "" || isNaN(n) ? "" : Number(n).toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: Number(n) % 1 ? 2 : 0 });
const num = v => v === "" || v == null ? null : Number(v);
const TRACKS = { service:"Local service", products:"Products online", food:"Food and drink", publishing:"Publishing", app:"App or software", other:"Something else" };
const STAGES = { idea:"Just an idea", first:"First customers", running:"Already running" };
const GOALS = { side:"Side income", full:"Full-time living", big:"Build something big" };

if (!S.supabaseUrl) {
  root.innerHTML = `<p class="m-note">Sign-in isn't configured on this site yet.</p>`;
} else {
  const sb = createClient(S.supabaseUrl, S.supabaseAnonKey);
  let members = [], current = null;

  sb.auth.getSession().then(({ data }) => data.session ? load() : login());

  function login() {
    root.innerHTML = `<div class="m-card m-login"><h1 class="title" style="font-size:36px">Admin sign-in</h1>
      <form id="login"><label class="vh" for="a-email">Email</label>
        <input id="a-email" type="email" required autocomplete="email" placeholder="you@email.com">
        <button class="pill" type="submit">Email me a sign-in link</button></form>
      <p class="m-note" id="login-msg" aria-live="polite"></p></div>`;
    $("#login").addEventListener("submit", async e => {
      e.preventDefault();
      const { error } = await sb.auth.signInWithOtp({ email: $("#a-email").value.trim(), options: { emailRedirectTo: location.origin + "/admin.html" } });
      $("#login-msg").textContent = error ? "That didn't send. Try again." : "Check your inbox for the sign-in link.";
    });
  }

  async function load(selectId) {
    const { data, error } = await sb.rpc("admin_members");
    if (error) { root.innerHTML = `<div class="m-card"><h2>Admins only</h2><p class="m-note">This account can't open the admin page.</p></div>`; return; }
    members = data || [];
    root.innerHTML = `<div class="m-top"><div><p class="eyebrow" style="font-size:17px">Admin</p><h1>Members</h1></div>
        <button class="pill ghost" id="signout" type="button">Sign out</button></div>
      <div class="ad-grid"><div class="m-card ad-list" id="list"></div><div class="m-card" id="detail"><p class="m-note">Pick a member.</p></div></div>`;
    $("#signout").addEventListener("click", async () => { await sb.auth.signOut(); location.reload(); });
    renderList();
    const pick = members.find(m => m.user_id === selectId) || members.find(m => !m.note) || members[0];
    if (pick) open(pick.user_id);
  }

  function renderList() {
    $("#list").innerHTML = members.length ? `<h2>Members <span class="ad-count">${members.length}</span></h2>` + members.map(m => `
      <button type="button" class="ad-item ${current === m.user_id ? "on" : ""}" data-id="${m.user_id}">
        <b>${esc(m.business_name || m.email)}</b>
        <span>${esc(TRACKS[m.track] || "No intake yet")}${m.location ? " · " + esc(m.location) : ""}</span>
        <span class="ad-tag ${m.note ? "done" : ""}">${m.note ? "Note sent" : "Needs note"}</span>
      </button>`).join("") : `<h2>Members</h2><p class="m-note">No paying members yet.</p>`;
    $("#list").querySelectorAll("[data-id]").forEach(b => b.addEventListener("click", () => open(b.dataset.id)));
  }

  async function open(id) {
    current = id; renderList();
    const m = members.find(x => x.user_id === id), box = $("#detail");
    box.innerHTML = `<p class="m-note">Loading...</p>`;
    let { data: base } = await sb.from("baselines").select("*").eq("user_id", id).maybeSingle();

    const head = `<h2>${esc(m.business_name || "No business name yet")}</h2>
      <p class="hint">${esc(m.email)}${(m.kits || []).length ? " · " + m.kits.map(esc).join(", ") : ""}</p>
      <dl class="ad-intake">
        <div><dt>Track</dt><dd>${esc(TRACKS[m.track] || "-")}</dd></div>
        <div><dt>Where</dt><dd>${esc(m.location || "-")}</dd></div>
        <div><dt>Stage</dt><dd>${esc(STAGES[m.stage] || "-")}</dd></div>
        <div><dt>Goal</dt><dd>${esc(GOALS[m.goal] || "-")}</dd></div>
      </dl>
      ${m.about ? `<p class="ad-about">${esc(m.about)}</p>` : ""}`;

    if (!base) {
      box.innerHTML = head + (m.track
        ? `<p class="m-note">They haven't opened their baseline yet.</p><button class="pill" id="mk" type="button">Create their ${esc(TRACKS[m.track])} baseline</button>`
        : `<p class="m-note">No intake yet, so there's no track to build a baseline from. Their note still works.</p>`) + noteForm(m);
      const mk = $("#mk");
      if (mk) mk.addEventListener("click", async () => {
        const { data: t } = await sb.from("baseline_templates").select("prices, costs").eq("track", m.track).maybeSingle();
        const { error } = await sb.from("baselines").insert({ user_id: id, track: m.track, prices: t?.prices || [], costs: t?.costs || [] });
        if (error) { $("#ad-msg").textContent = "Couldn't create it: " + error.message; return; }
        open(id);
      });
      wireNote(m);
      return;
    }

    const cost = c => c.need === "Skip" ? 0 : Number(c.yours ?? c.typical ?? 0) || 0;
    const nowTotal = base.costs.filter(c => c.need === "Now").reduce((a, c) => a + cost(c), 0);
    const price = base.prices[0]?.yours, fee = price ? price * 0.029 + 0.3 : null;
    const keep = price ? price - (base.cost_per_sale || 0) - fee : null;
    const be = keep == null ? "Not enough numbers yet" : keep <= 0 ? "Losing money per sale" : `${Math.ceil((base.monthly_costs || 0) / keep)} a month`;
    const flag = p => p.yours == null || p.low == null || p.high == null ? "" : p.yours < p.low ? `<span class="bl-flag low">Below</span>` : p.yours > p.high ? `<span class="bl-flag">Above</span>` : `<span class="bl-flag ok">In range</span>`;

    box.innerHTML = head + `
      <h3>Standard ranges</h3>
      <div class="bl-scroll"><table class="bl"><thead><tr><th>Offer</th><th>Low</th><th>High</th><th>Their price</th><th></th></tr></thead><tbody>
        ${base.prices.map((p, i) => `<tr><th scope="row">${esc(p.name)}</th>
          <td><label class="vh" for="lo${i}">Low</label><input id="lo${i}" inputmode="decimal" data-lo="${i}" value="${p.low ?? ""}" placeholder="$"></td>
          <td><label class="vh" for="hi${i}">High</label><input id="hi${i}" inputmode="decimal" data-hi="${i}" value="${p.high ?? ""}" placeholder="$"></td>
          <td>${p.yours != null ? usd(p.yours) : "-"}</td><td>${flag(p)}</td></tr>`).join("")}
      </tbody></table></div>
      <p class="bl-total"><span>Needed now <b>${usd(nowTotal) || "$0"}</b></span><span>Cost per sale <b>${usd(base.cost_per_sale) || "-"}</b></span><span>Monthly <b>${usd(base.monthly_costs) || "-"}</b></span><span>Break-even <b>${esc(be)}</b></span></p>
      <p class="bl-fine">Last edited ${new Date(base.updated_at).toLocaleString()}</p>` + noteForm(m);
    wireNote(m, true);
  }

  const noteForm = m => `<h3>Your note</h3>
    <label class="vh" for="ad-note">Note to this member</label>
    <textarea id="ad-note" class="ad-note" placeholder="The one number to watch, and what to do this week.">${esc(m.note || "")}</textarea>
    <button class="pill" id="ad-save" type="button">Save</button><p class="m-note" id="ad-msg" aria-live="polite"></p>`;

  function wireNote(m, withRanges) {
    $("#ad-save").addEventListener("click", async () => {
      const btn = $("#ad-save"); btn.disabled = true; $("#ad-msg").textContent = "Saving...";
      let err = null;
      if (withRanges) {
        // Re-read first so a member's own edits made meanwhile aren't overwritten; only low/high change.
        const { data: fresh, error: e1 } = await sb.from("baselines").select("prices").eq("user_id", m.user_id).single();
        err = e1;
        if (!err) {
          const prices = fresh.prices.map((p, i) => {
            const lo = $(`[data-lo="${i}"]`), hi = $(`[data-hi="${i}"]`);
            return lo && hi ? { ...p, low: num(lo.value), high: num(hi.value) } : p;
          });
          ({ error: err } = await sb.from("baselines").update({ prices, updated_at: new Date().toISOString() }).eq("user_id", m.user_id));
        }
      }
      if (!err) ({ error: err } = await sb.from("baseline_notes").upsert({ user_id: m.user_id, note: $("#ad-note").value.trim(), updated_at: new Date().toISOString() }));
      btn.disabled = false;
      if (err) { $("#ad-msg").textContent = "Couldn't save: " + err.message; return; }
      await load(m.user_id); $("#ad-msg") && ($("#ad-msg").textContent = "Saved. They'll see it next time they open their member area.");
    });
  }
}
