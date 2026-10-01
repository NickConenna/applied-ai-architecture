/* Demos section: tabs, quote box, recorded AI exchange. */
(function(){
  const $ = q => document.querySelector(q), $$ = q => [...document.querySelectorAll(q)];
  const tabs = $$("#demos .tab"); if (!tabs.length) return;
  const pick = t => { tabs.forEach(x => { const on = x === t; x.setAttribute("aria-selected", on); x.tabIndex = on ? 0 : -1;
    document.getElementById(x.getAttribute("aria-controls")).hidden = !on; }); t.focus(); };
  tabs.forEach((t,i) => { t.addEventListener("click", () => pick(t));
    t.addEventListener("keydown", e => { if (e.key === "ArrowRight") pick(tabs[(i+1)%tabs.length]);
      if (e.key === "ArrowLeft") pick(tabs[(i-1+tabs.length)%tabs.length]); }); });

  const job = $("#dq-job"), size = $("#dq-size");
  const quote = () => { const mid = Math.round(size.value * job.value / 10) * 10, lo = Math.max(100, mid - 50);
    $("#dq-sizeout").textContent = Number(size.value).toLocaleString() + " sq ft";
    $("#dq-range").textContent = "$" + lo + " – $" + (mid + 50); };
  job.addEventListener("change", quote); size.addEventListener("input", quote); quote();

  const script = [
    ["you","A customer wants their driveway and deck done Saturday. What do I quote?"],
    ["ai","For about 2,800 sq ft in 28031, your standard range is $210 to $310. Saturday 9 AM is open. Want me to send the quote with a $50 deposit link?"],
    ["you","Yes. And remind me if they don\u2019t pay by Thursday."],
    ["ai","Sent. I\u2019ll check Thursday at noon. If the deposit isn\u2019t in, I\u2019ll draft a friendly follow-up for you to approve."]
  ];
  let i = 0; const chat = $("#dc-chat"), next = $("#dc-next");
  const step = () => { if (i >= script.length) { chat.innerHTML = ""; i = 0; }
    const m = document.createElement("div"); m.className = "msg " + script[i][0]; m.textContent = script[i][1]; chat.appendChild(m); i++;
    next.textContent = i >= script.length ? "Replay" : "Next message"; };
  next.addEventListener("click", step); step();
})();
