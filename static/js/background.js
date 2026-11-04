/* Cross-fading background slideshow (images from static/img/bg via /api/backgrounds). */
(function () {
  "use strict";
  const layers = [document.getElementById("bg-a"), document.getElementById("bg-b")];
  if (!layers[0] || !layers[1]) return;
  const INTERVAL = 9000;
  let images = [], index = 0, active = 0;

  function preload(src) {
    return new Promise(function (resolve) {
      const img = new Image();
      img.onload = function () { resolve(src); };
      img.onerror = function () { resolve(null); };
      img.src = src;
    });
  }

  async function next() {
    if (!images.length) return;
    const src = await preload(images[index % images.length]);
    index++;
    if (!src) return;
    const incoming = layers[1 - active];
    const outgoing = layers[active];
    incoming.style.backgroundImage = 'url("' + src + '")';
    incoming.classList.add("show");
    outgoing.classList.remove("show");
    active = 1 - active;
  }

  window.api("/api/backgrounds").then(function (d) {
    images = (d.images || []).slice();
    // shuffle so every visit starts differently
    for (let i = images.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = images[i]; images[i] = images[j]; images[j] = t;
    }
    next();
    if (images.length > 1 && !window.prefersReducedMotion) setInterval(next, INTERVAL);
  }).catch(function () { /* backgrounds are decoration only */ });
})();
