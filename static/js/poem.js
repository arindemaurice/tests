/* Types the poem from /static/data/poem.json, chapter after chapter, then reveals
   the WhatsApp call-to-action. Markup in the JSON: [[colour|text]]. */
(function () {
  "use strict";
  const editor = document.getElementById("editor");
  const cta = document.getElementById("cta");
  const progress = document.getElementById("poem-progress");
  const replay = document.getElementById("replay");
  const waLink = document.getElementById("wa-link");
  if (!editor) return;

  const COLORS = { blue: 1, purple: 1, red: 1, yellow: 1, green: 1, gray: 1 };
  const MARK = /\[\[(\w+)\|(.*?)\]\]/g;
  const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  let runId = 0;

  function parse(line) {
    const parts = []; let last = 0, m;
    MARK.lastIndex = 0;
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
      // Array.from keeps emoji intact
      let out = "";
      for (const ch of Array.from(p.t)) {
        if (id !== runId) return false;
        out += ch; span.textContent = out;
        await sleep(ch === " " ? 20 : 38);
      }
    }
    return true;
  }

  async function play(poem) {
    const id = ++runId;
    editor.textContent = "";
    cta.hidden = true;
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    const instant = window.prefersReducedMotion;
    for (let s = 0; s < poem.stanzas.length; s++) {
      progress.textContent = "Chapter " + (s + 1) + " / " + poem.stanzas.length;
      for (const raw of poem.stanzas[s]) {
        if (id !== runId) return;
        const el = document.createElement("span");
        el.className = "line";
        editor.appendChild(el);
        el.appendChild(cursor);
        const lineEl = document.createElement("span");
        el.insertBefore(lineEl, cursor);
        const ok = await typeLine(parse(raw), lineEl, id, instant);
        if (!ok) return;
        editor.scrollTop = editor.scrollHeight;
        await sleep(raw === "" ? 160 : (instant ? 0 : 300));
      }
      await sleep(instant ? 0 : 900);
      if (s < poem.stanzas.length - 1) {
        const gap = document.createElement("span");
        gap.className = "line";
        editor.appendChild(gap);
      }
    }
    if (id !== runId) return;
    cta.hidden = false;
    cta.scrollIntoView({ behavior: instant ? "auto" : "smooth", block: "nearest" });
    // Tell the server this account finished the poem (only works when logged in).
    window.api("/api/event", "POST", { kind: "poem_finished" }).catch(function () { /* anonymous visitors: ignore */ });
  }

  let poemData = null;
  fetch("/static/data/poem.json").then(function (r) { return r.json(); }).then(function (p) {
    poemData = p; play(p);
  }).catch(function () { editor.textContent = "// could not load poem.json"; });

  replay.addEventListener("click", function () { if (poemData) play(poemData); });

  // Personalised WhatsApp link (adds the username when logged in)
  window.api("/api/whatsapp").then(function (d) { if (d && d.link) waLink.href = d.link; }).catch(function () {});
  waLink.addEventListener("click", function () {
    window.api("/api/event", "POST", { kind: "fell_in_love" }).catch(function () {});
  });

  // "Photo memories": your own pictures from static/img/people, shown as a polaroid.
  const memories = document.getElementById("memories");
  const img = document.getElementById("polaroid-img");
  const cap = document.getElementById("polaroid-cap");
  window.api("/api/people").then(function (d) {
    const list = d.images || [];
    if (!list.length) return;
    memories.hidden = false;
    let i = 0;
    function show() {
      const src = list[i % list.length]; i++;
      img.style.opacity = 0;
      setTimeout(function () {
        img.src = src;
        cap.textContent = "memory #" + (((i - 1) % list.length) + 1);
        img.style.opacity = 1;
      }, 400);
    }
    img.style.transition = "opacity .5s";
    show();
    if (list.length > 1) setInterval(show, 6000);
  }).catch(function () {});
})();
