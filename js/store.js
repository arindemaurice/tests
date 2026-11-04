/* Browser-only accounts + heart status (localStorage). */
(function () {
  "use strict";
  window.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const QUIZ = [
    { q: "How did the poem make you feel?", a: ["Nothing yet", "It made me smile", "Butterflies", "My heart skipped a beat"] },
    { q: "Would you read the next chapter?", a: ["Probably not", "Maybe", "Yes", "Right now, please"] },
    { q: "Is a coder's sense of humour your type?", a: ["Not really", "Sometimes", "Quite a lot", "It's my favourite type"] },
    { q: "If we met for coffee, you would...", a: ["Stay home", "Say hi and leave early", "Stay for a while", "Lose track of time"] },
    { q: "Late-night debugging side by side sounds...", a: ["Awful", "Tolerable", "Fun", "Like a date"] },
    { q: "Your heartbeat right now is...", a: ["Calm", "A bit faster", "Racing", "Off the charts"] },
    { q: "Ready to send a message?", a: ["No", "Not sure", "Almost", "Yes, opening WhatsApp"] }
  ];
  const LEVELS = [
    [0, "Cold boot", "The system hasn't started yet."],
    [20, "Compiling...", "Something is building. No errors so far."],
    [40, "Warm cache", "Familiar feelings are loading faster."],
    [60, "Heart racing", "CPU at 90%. This is getting serious."],
    [80, "Fully deployed", "In love. Production is live."]
  ];

  const read = function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (_) { return d; } };
  const write = function (k, v) { localStorage.setItem(k, JSON.stringify(v)); };

  const enc = new TextEncoder();
  const hex = function (buf) { return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join(""); };
  async function hash(password, saltHex) {
    if (!window.crypto || !crypto.subtle) throw new Error("Open the site over https:// or from a local file; this browser blocks secure hashing.");
    const salt = new Uint8Array(saltHex.match(/../g).map(function (h) { return parseInt(h, 16); }));
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    return hex(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: salt, iterations: 150000, hash: "SHA-256" }, key, 256));
  }
  function randomHex(n) { return hex(crypto.getRandomValues(new Uint8Array(n))); }

  const Store = {
    QUIZ: QUIZ,
    users: function () { return read("llc_users", {}); },
    current: function () {
      const name = localStorage.getItem("llc_session");
      const u = name && Store.users()[name.toLowerCase()];
      return u || null;
    },
    async register(username, email, password) {
      username = username.trim(); email = email.trim().toLowerCase();
      if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) throw new Error("Username must be 3-24 letters, numbers or underscores.");
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Enter a valid email address.");
      if (password.length < 8 || password.length > 128) throw new Error("Password must be 8-128 characters.");
      const users = Store.users();
      if (users[username.toLowerCase()] || Object.values(users).some(function (u) { return u.email === email; }))
        throw new Error("That username or email is already registered on this device.");
      const salt = randomHex(16);
      users[username.toLowerCase()] = { username: username, email: email, salt: salt, hash: await hash(password, salt),
        created: new Date().toISOString(), quiz: null, reads: 0, declared: false };
      write("llc_users", users);
      localStorage.setItem("llc_session", username.toLowerCase());
    },
    async login(identity, password) {
      identity = identity.trim().toLowerCase();
      const fails = read("llc_fails", { n: 0, t: 0 });
      if (fails.n >= 8 && Date.now() - fails.t < 600000) throw new Error("Too many attempts. Try again in a few minutes.");
      const u = Object.values(Store.users()).find(function (x) { return x.username.toLowerCase() === identity || x.email === identity; });
      if (u && (await hash(password, u.salt)) === u.hash) {
        write("llc_fails", { n: 0, t: 0 });
        localStorage.setItem("llc_session", u.username.toLowerCase());
        return;
      }
      write("llc_fails", { n: fails.n + 1, t: Date.now() });
      throw new Error("Wrong username/email or password.");
    },
    logout: function () { localStorage.removeItem("llc_session"); },
    update: function (fn) {
      const users = Store.users(), u = Store.current();
      if (!u) return null;
      fn(users[u.username.toLowerCase()]);
      write("llc_users", users);
      return Store.status();
    },
    saveQuiz: function (answers) { return Store.update(function (u) { u.quiz = answers; }); },
    addRead: function () { return Store.update(function (u) { u.reads += 1; }); },
    declare: function () { return Store.update(function (u) { u.declared = true; }); },
    status: function () {
      const u = Store.current();
      if (!u) return null;
      const quizPts = u.quiz ? Math.round(u.quiz.reduce(function (a, b) { return a + b; }, 0) / (QUIZ.length * 3) * 60) : 0;
      const poemPts = Math.min(u.reads, 5) * 4, declPts = u.declared ? 20 : 0;
      const score = Math.min(100, quizPts + poemPts + declPts);
      let lv = LEVELS[0];
      LEVELS.forEach(function (l) { if (score >= l[0]) lv = l; });
      return { score: score, level: lv[1], message: lv[2], bpm: 60 + Math.round(score * 0.9), reads: u.reads,
        breakdown: { quiz: quizPts, poem: poemPts, declared: declPts }, quiz: u.quiz, declared: u.declared };
    },
    whatsapp: function () {
      const u = Store.current();
      let t = (u ? "Hi! It's " + u.username + ". " : "Hi! ") + "I read your 'Love Is Like Coding' poem and I think I've fallen in love ❤️";
      return "https://wa.me/" + window.CONFIG.whatsappNumber + "?text=" + encodeURIComponent(t);
    }
  };
  window.Store = Store;
})();
