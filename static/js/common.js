/* Shared helpers: CSRF-aware JSON fetch. */
(function () {
  "use strict";
  const meta = document.querySelector('meta[name="csrf-token"]');
  window.CSRF = meta ? meta.content : "";

  window.api = async function api(url, method, body) {
    const opts = { method: method || "GET", headers: { Accept: "application/json" }, credentials: "same-origin" };
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    if (opts.method !== "GET") opts.headers["X-CSRF-Token"] = window.CSRF;
    const res = await fetch(url, opts);
    let data = null;
    try { data = await res.json(); } catch (_) { /* non-JSON response */ }
    if (!res.ok) {
      const err = new Error((data && data.error) || "Request failed (" + res.status + ")");
      err.status = res.status;
      throw err;
    }
    return data;
  };

  window.prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
})();
