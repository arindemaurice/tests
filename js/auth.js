/* Handles register.html and login.html forms. */
(function () {
  "use strict";
  const form = document.getElementById("auth-form"), err = document.getElementById("auth-err");
  const mode = form.dataset.mode;
  if (Store.current()) location.replace("dashboard.html");
  form.addEventListener("submit", async function (e) {
    e.preventDefault(); err.textContent = "";
    const f = new FormData(form), btn = form.querySelector("button[type=submit]");
    btn.disabled = true;
    try {
      if (mode === "register") await Store.register(f.get("username"), f.get("email"), f.get("password"));
      else await Store.login(f.get("identity"), f.get("password"));
      location.href = "dashboard.html";
    } catch (ex) { err.textContent = ex.message; btn.disabled = false; }
  });
})();
