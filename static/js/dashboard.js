/* Dashboard: heart meter, ECG monitor, quiz submit, WhatsApp declaration. */
(function () {
  "use strict";
  const root = document.getElementById("dash");
  if (!root) return;
  let status = JSON.parse(root.dataset.status);

  const $ = function (id) { return document.getElementById(id); };
  const fill = $("heart-fill");
  const heartSvg = document.querySelector(".big-heart");

  function render(s) {
    status = s;
    $("score").textContent = s.score;
    $("level").textContent = s.level;
    $("level-msg").textContent = s.message;
    $("bpm").textContent = s.bpm;
    $("b-quiz").textContent = s.breakdown.quiz;
    $("b-poem").textContent = s.breakdown.poem;
    $("b-decl").textContent = s.breakdown.declared;
    $("reads").textContent = s.poem_reads;
    // heart fills from bottom: y goes 90 (empty) -> 0 (full)
    fill.setAttribute("y", String(90 - (90 * s.score) / 100));
    heartSvg.style.setProperty("--beat", (60 / s.bpm).toFixed(2) + "s");
    heartSvg.classList.add("beating");
    $("wa-direct").href = s.whatsapp;
    if (s.quiz_answers) {
      s.quiz_answers.forEach(function (a, i) {
        const r = document.querySelector('input[name="q' + i + '"][value="' + a + '"]');
        if (r) r.checked = true;
      });
    }
  }

  // ---- ECG monitor ----
  const ecg = $("ecg"), c = ecg.getContext("2d");
  let x = 0, lastY = ecg.height / 2, phase = 0;
  function ecgY(p) { // p in 0..1 inside one beat
    const mid = ecg.height / 2;
    if (p < 0.10) return mid;
    if (p < 0.16) return mid - 8 * Math.sin((p - 0.10) / 0.06 * Math.PI);        // P wave
    if (p < 0.30) return mid;
    if (p < 0.33) return mid + 6;                                                // Q
    if (p < 0.37) return mid - 36;                                               // R spike
    if (p < 0.41) return mid + 12;                                               // S
    if (p < 0.50) return mid;
    if (p < 0.64) return mid - 12 * Math.sin((p - 0.50) / 0.14 * Math.PI);       // T wave
    return mid;
  }
  function drawEcg() {
    const pxPerBeat = 3600 / Math.max(status.bpm, 40) / 6; // faster heart -> shorter beat
    const step = 2;
    c.fillStyle = "rgba(11,16,25,.35)"; c.fillRect(x, 0, step * 6, ecg.height);
    phase = (phase + step / pxPerBeat) % 1;
    const y = ecgY(phase);
    c.strokeStyle = "#83e6d0"; c.lineWidth = 2; c.beginPath();
    c.moveTo(x, lastY); c.lineTo(x + step, y); c.stroke();
    lastY = y; x += step;
    if (x >= ecg.width) { x = 0; c.fillStyle = "#0b1019"; c.fillRect(0, 0, 10, ecg.height); lastY = y; }
    requestAnimationFrame(drawEcg);
  }
  c.fillStyle = "#0b1019"; c.fillRect(0, 0, ecg.width, ecg.height);
  if (!window.prefersReducedMotion) drawEcg();

  // ---- Quiz ----
  const form = $("quiz-form"), msg = $("quiz-msg");
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    const answers = [];
    for (let i = 0; ; i++) {
      const group = form.querySelectorAll('input[name="q' + i + '"]');
      if (!group.length) break;
      const picked = form.querySelector('input[name="q' + i + '"]:checked');
      if (!picked) { msg.textContent = "Please answer every question."; return; }
      answers.push(parseInt(picked.value, 10));
    }
    msg.textContent = "Saving...";
    try {
      render(await window.api("/api/quiz", "POST", { answers: answers }));
      msg.textContent = "Heart status updated ❤️";
    } catch (err) { msg.textContent = err.message; }
  });

  // ---- Declare + WhatsApp ----
  $("declare").addEventListener("click", async function () {
    // Open the tab synchronously (popup blockers), then update the score.
    const win = window.open(status.whatsapp, "_blank", "noopener,noreferrer");
    try { render(await window.api("/api/event", "POST", { kind: "fell_in_love" })); } catch (_) {}
    if (!win) window.location.href = status.whatsapp;
  });

  render(status);
})();
