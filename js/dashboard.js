/* Dashboard: heart meter, ECG, quiz, WhatsApp declaration. */
(function () {
  "use strict";
  const user = Store.current();
  if (!user) { location.replace("login.html"); return; }
  const $ = function (id) { return document.getElementById(id); };
  let status = Store.status();

  $("hello").textContent = "Hello, " + user.username + " 👋";
  $("since").textContent = "Member since " + user.created.slice(0, 10);

  // Build the quiz
  $("quiz-fields").innerHTML = Store.QUIZ.map(function (item, qi) {
    return "<fieldset><legend>" + (qi + 1) + ". " + item.q + "</legend>" + item.a.map(function (opt, oi) {
      return '<label class="opt"><input type="radio" name="q' + qi + '" value="' + oi + '" required> ' + opt + "</label>";
    }).join("") + "</fieldset>";
  }).join("");

  const heart = document.querySelector(".big-heart");
  function render(s) {
    status = s;
    $("score").textContent = s.score; $("level").textContent = s.level; $("level-msg").textContent = s.message;
    $("bpm").textContent = s.bpm; $("b-quiz").textContent = s.breakdown.quiz;
    $("b-poem").textContent = s.breakdown.poem; $("b-decl").textContent = s.breakdown.declared; $("reads").textContent = s.reads;
    $("heart-fill").setAttribute("y", String(90 - 0.9 * s.score));
    heart.style.setProperty("--beat", (60 / s.bpm).toFixed(2) + "s"); heart.classList.add("beating");
    $("wa-direct").href = Store.whatsapp();
    if (s.quiz) s.quiz.forEach(function (a, i) { const r = document.querySelector('input[name="q' + i + '"][value="' + a + '"]'); if (r) r.checked = true; });
  }

  // ECG monitor
  const ecg = $("ecg"), c = ecg.getContext("2d"); let x = 0, lastY = ecg.height / 2, phase = 0;
  function ecgY(p) {
    const m = ecg.height / 2;
    if (p < .10) return m; if (p < .16) return m - 8 * Math.sin((p - .10) / .06 * Math.PI);
    if (p < .30) return m; if (p < .33) return m + 6; if (p < .37) return m - 36; if (p < .41) return m + 12;
    if (p < .50) return m; if (p < .64) return m - 12 * Math.sin((p - .50) / .14 * Math.PI); return m;
  }
  function draw() {
    const ppb = 3600 / Math.max(status.bpm, 40) / 6, step = 2;
    c.fillStyle = "rgba(11,16,25,.35)"; c.fillRect(x, 0, step * 6, ecg.height);
    phase = (phase + step / ppb) % 1; const y = ecgY(phase);
    c.strokeStyle = "#83e6d0"; c.lineWidth = 2; c.beginPath(); c.moveTo(x, lastY); c.lineTo(x + step, y); c.stroke();
    lastY = y; x += step;
    if (x >= ecg.width) { x = 0; c.fillStyle = "#0b1019"; c.fillRect(0, 0, 10, ecg.height); }
    requestAnimationFrame(draw);
  }
  c.fillStyle = "#0b1019"; c.fillRect(0, 0, ecg.width, ecg.height);
  if (!window.prefersReducedMotion) draw();

  $("quiz-form").addEventListener("submit", function (e) {
    e.preventDefault();
    const answers = [];
    for (let i = 0; i < Store.QUIZ.length; i++) {
      const p = document.querySelector('input[name="q' + i + '"]:checked');
      if (!p) { $("quiz-msg").textContent = "Please answer every question."; return; }
      answers.push(parseInt(p.value, 10));
    }
    render(Store.saveQuiz(answers)); $("quiz-msg").textContent = "Heart status updated ❤️";
  });
  $("declare").addEventListener("click", function () {
    const w = window.open(Store.whatsapp(), "_blank", "noopener,noreferrer");
    render(Store.declare());
    if (!w) location.href = Store.whatsapp();
  });
  render(status);
})();
