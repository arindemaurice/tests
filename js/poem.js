/* Types the poem (js/poem-data.js), then reveals the WhatsApp call-to-action. */
(function () {
  "use strict";
  const editor = document.getElementById("editor"), cta = document.getElementById("cta");
  const progress = document.getElementById("poem-progress"), replay = document.getElementById("replay");
  const waLink = document.getElementById("wa-link");
  const COLORS = { blue: 1, purple: 1, red: 1, yellow: 1, green: 1, gray: 1 };
  const MARK = /\[\[(\w+)\|(.*?)\]\]/g;
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  let runId = 0;

  function parse(line) {
    const parts = []; let last = 0, m; MARK.lastIndex = 0;
    while ((m = MARK.exec(line))) {
      if (m.index > last) parts.push({ t: line.slice(last, m.index), c: "" });
      parts.push({ t: m[2], c: COLORS[m[1]] ? "c-" + m[1] : "" });
      last = m.index + m[0].length;
    }
    if (last < line.length) parts.push({ t: line.slice(last), c: "" });
    return parts;
  }
  async function typeLine(parts, el, id, instant) {
    for (const p of parts) {
      const span = document.createElement("span");
      if (p.c) span.className = p.c;
      el.appendChild(span);
      if (instant) { span.textContent = p.t; continue; }
      let out = "";
      for (const ch of Array.from(p.t)) {
        if (id !== runId) return false;
        out += ch; span.textContent = out; await sleep(ch === " " ? 20 : 38);
      }
    }
    return true;
  }
  async function play() {
    const poem = window.POEM, id = ++runId, instant = window.prefersReducedMotion;
    editor.textContent = ""; cta.hidden = true;
    const cursor = document.createElement("span"); cursor.className = "cursor";
    for (let s = 0; s < poem.stanzas.length; s++) {
      progress.textContent = "Chapter " + (s + 1) + " / " + poem.stanzas.length;
      for (const raw of poem.stanzas[s]) {
        if (id !== runId) return;
        const el = document.createElement("span"); el.className = "line"; editor.appendChild(el);
        const lineEl = document.createElement("span"); el.appendChild(lineEl); el.appendChild(cursor);
        if (!(await typeLine(parse(raw), lineEl, id, instant))) return;
        editor.scrollTop = editor.scrollHeight;
        await sleep(raw === "" ? 160 : (instant ? 0 : 300));
      }
      await sleep(instant ? 0 : 900);
      if (s < poem.stanzas.length - 1) { const g = document.createElement("span"); g.className = "line"; editor.appendChild(g); }
    }
    if (id !== runId) return;
    cta.hidden = false;
    cta.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "nearest" });
    Store.addRead(); // counts towards heart status when logged in
  }
  waLink.href = Store.whatsapp();
  waLink.addEventListener("click", function () { Store.declare(); });
  replay.addEventListener("click", play);
  document.getElementById("cta-account").innerHTML = Store.current()
    ? '<a href="dashboard.html">Open your dashboard →</a>'
    : 'Want to track your heart status? <a href="register.html">Create an account</a> or <a href="login.html">log in</a>.';
  play();

  // Your own photos / video (configured in js/config.js)
  const photos = CONFIG.photos || [];
  if (photos.length) {
    const box = document.getElementById("memories"), img = document.getElementById("polaroid-img"), cap = document.getElementById("polaroid-cap");
    box.hidden = false; img.style.transition = "opacity .5s"; let k = 0;
    const show = function () { const n = k++ % photos.length; img.style.opacity = 0;
      setTimeout(function () { img.src = photos[n]; cap.textContent = "memory #" + (n + 1); img.style.opacity = 1; }, 400); };
    show(); if (photos.length > 1) setInterval(show, 6000);
  }
  if (CONFIG.video) {
    const v = document.getElementById("home-video"); v.src = CONFIG.video; v.hidden = false;
  }
})();
