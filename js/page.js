/* Shared page chrome: navigation + cross-fading background slideshow. */
(function () {
  "use strict";
  const nav = document.getElementById("nav");
  const u = Store.current();
  nav.innerHTML = '<a class="brand" href="index.html">💗 love.js</a><div class="navlinks">' +
    (u ? '<a href="dashboard.html">Dashboard</a><button class="linklike" id="logout" type="button">Log out (' + u.username.replace(/[<>&"]/g, "") + ')</button>'
       : '<a href="login.html">Log in</a><a class="pill" href="register.html">Create account</a>') + "</div>";
  const lo = document.getElementById("logout");
  if (lo) lo.addEventListener("click", function () { Store.logout(); location.href = "index.html"; });

  const layers = [document.getElementById("bg-a"), document.getElementById("bg-b")];
  const imgs = CONFIG.backgrounds.slice().sort(function () { return Math.random() - 0.5; });
  let i = 0, active = 0;
  function next() {
    if (!imgs.length) return;
    const src = imgs[i++ % imgs.length], im = new Image();
    im.onload = function () {
      const inc = layers[1 - active], out = layers[active];
      inc.style.backgroundImage = 'url("' + src + '")';
      inc.classList.add("show"); out.classList.remove("show"); active = 1 - active;
    };
    im.src = src;
  }
  next();
  if (imgs.length > 1 && !window.prefersReducedMotion) setInterval(next, 9000);
})();
