/* Moving code characters: falling code rain, drifting tokens, and two little
   ASCII characters (a runner and a bug) that cross the bottom of the screen. */
(function () {
  "use strict";
  const canvas = document.getElementById("code-rain");
  if (!canvas || window.prefersReducedMotion) return;
  const ctx = canvas.getContext("2d");
  const GLYPHS = "01{}[]();<>/=+-*&|!?#$%λ∑π∞♥".split("");
  const TOKENS = ["<3", "{ }", "</>", "=>", "++", "404", "null", "true", "love()", "git push", "if(you)", "♥", "0xFF", "while(1)"];
  const COLORS = ["#59d5f5", "#c5a5ff", "#ff8295", "#f6d58b", "#83e6d0"];
  let W = 0, H = 0, cols = [], floaters = [], dpr = 1;
  const FS = 16;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.ceil(W / (FS * 1.6));
    cols = [];
    for (let i = 0; i < n; i++) {
      cols.push({ x: i * FS * 1.6, y: Math.random() * -H, speed: 1 + Math.random() * 2.2, len: 6 + Math.floor(Math.random() * 14), trail: [] });
    }
    floaters = [];
    const count = W < 600 ? 7 : 14;
    for (let i = 0; i < count; i++) floaters.push(newFloater(true));
  }

  function newFloater(anywhere) {
    return {
      t: TOKENS[Math.floor(Math.random() * TOKENS.length)],
      x: Math.random() * W,
      y: anywhere ? Math.random() * H : H + 30,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -(0.25 + Math.random() * 0.6),
      a: 0.25 + Math.random() * 0.45,
      s: 12 + Math.random() * 14,
      c: COLORS[Math.floor(Math.random() * COLORS.length)],
      ph: Math.random() * 6.28
    };
  }

  // ASCII characters
  const RUN_A = [" O ", "/|\\", "/ \\"];
  const RUN_B = [" O ", "\\|/", " | "];
  const BUG = ["(>_<)", " /|\\ "];
  const runner = { x: -80, y: 0, dir: 1, frame: 0, tick: 0, say: "love();" };
  const bug = { x: 0, dir: -1, tick: 0 };
  let sparks = [];

  function drawLines(lines, x, y, color, size) {
    ctx.fillStyle = color; ctx.font = "bold " + size + "px Consolas, 'Courier New', monospace";
    for (let i = 0; i < lines.length; i++) ctx.fillText(lines[i], x, y + i * size * 1.05);
  }

  function frame(time) {
    // fade previous frame for trails
    ctx.clearRect(0, 0, W, H);

    ctx.font = FS + "px Consolas, 'Courier New', monospace";
    for (const c of cols) {
      c.y += c.speed;
      if (Math.floor(c.y / FS) !== c.lastRow) {
        c.lastRow = Math.floor(c.y / FS);
        c.trail.unshift(GLYPHS[Math.floor(Math.random() * GLYPHS.length)]);
        if (c.trail.length > c.len) c.trail.pop();
      }
      for (let i = 0; i < c.trail.length; i++) {
        const alpha = (1 - i / c.len) * 0.55;
        ctx.fillStyle = i === 0 ? "rgba(255,255,255," + alpha + ")" : "rgba(89,213,245," + alpha * 0.8 + ")";
        ctx.fillText(c.trail[i], c.x, c.y - i * FS);
      }
      if (c.y - c.len * FS > H) { c.y = Math.random() * -200; c.trail = []; c.speed = 1 + Math.random() * 2.2; }
    }

    for (const f of floaters) {
      f.x += f.vx + Math.sin(time / 1500 + f.ph) * 0.3; f.y += f.vy;
      ctx.globalAlpha = f.a; ctx.fillStyle = f.c;
      ctx.font = "bold " + f.s + "px Consolas, 'Courier New', monospace";
      ctx.fillText(f.t, f.x, f.y);
      if (f.y < -40) Object.assign(f, newFloater(false));
    }
    ctx.globalAlpha = 1;

    // runner (a coder in a hurry) crossing the screen with a speech bubble
    const base = H - 78;
    runner.tick++;
    if (runner.tick % 9 === 0) runner.frame = 1 - runner.frame;
    runner.x += 1.8 * runner.dir;
    if (runner.x > W + 90) { runner.dir = -1; runner.say = "git commit -m '<3'"; }
    if (runner.x < -90) { runner.dir = 1; runner.say = "love();"; }
    const bob = Math.abs(Math.sin(runner.tick / 6)) * 4;
    drawLines(runner.frame ? RUN_A : RUN_B, runner.x, base - bob, "#f6d58b", 18);
    ctx.font = "12px Consolas, monospace"; ctx.fillStyle = "#ff8295";
    ctx.fillText(runner.say, runner.x - 10, base - 28 - bob);
    if (runner.tick % 40 === 0) sparks.push({ x: runner.x + 10, y: base - 10, life: 60, ch: Math.random() > 0.5 ? "♥" : "<3" });

    // the bug that the runner never catches
    bug.tick++;
    bug.x += 0.9 * bug.dir;
    if (bug.x < -80) bug.dir = 1;
    if (bug.x > W + 80) bug.dir = -1;
    if (bug.x === 0) bug.x = W * 0.7;
    drawLines(BUG, bug.x, H - 30 + Math.sin(bug.tick / 8) * 2, "#ff5f57", 14);

    sparks = sparks.filter(function (s) { return s.life-- > 0; });
    for (const s of sparks) {
      s.y -= 0.8; ctx.globalAlpha = s.life / 60; ctx.fillStyle = "#ff648c";
      ctx.font = "16px Consolas, monospace"; ctx.fillText(s.ch, s.x, s.y);
    }
    ctx.globalAlpha = 1;
    requestAnimationFrame(frame);
  }

  window.addEventListener("resize", resize);
  resize();
  bug.x = W * 0.7;
  runner.y = H - 78;
  requestAnimationFrame(frame);
})();
