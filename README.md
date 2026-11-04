# Love Is Like Coding ❤️

A romantic coding-themed website: an animated poem typed out in a code editor, falling code
characters with a little runner and a bug, background images that cross-fade, account
sign-up / login, a **heart-status dashboard**, and a **WhatsApp link** for anyone who has
fallen in love.

## Run it

**Linux / macOS**
```bash
./run.sh
```
**Windows**
```bat
run.bat
```
Then open <http://127.0.0.1:5000>.

**Docker**
```bash
docker compose up --build     # http://localhost:8000
```

Tests: `python -m unittest discover -s tests -v`

## What's inside

| Part | Files |
|------|-------|
| Backend (Python / Flask) | `app.py`, `schema.sql` (SQLite), `tests/test_app.py` |
| Pages (HTML / Jinja) | `templates/*.html` |
| Styling (CSS) | `static/css/style.css` |
| Front-end (JavaScript) | `static/js/poem.js`, `code-rain.js`, `background.js`, `dashboard.js`, `common.js` |
| Data (JSON) | `static/data/poem.json`, `config.json` |
| Art (SVG + generated JPEG) | `static/img/favicon.svg`, `static/img/bg/*.jpg`, `tools/make_assets.py` |
| Ops (Bash, Batch, Dockerfile, YAML) | `run.sh`, `run.bat`, `Dockerfile`, `docker-compose.yml` |

## Features

* **Poem** – six chapters typed live from `poem.json` (edit the text freely; `[[blue|word]]` colours a word).
* **Moving code** – falling glyph rain, drifting tokens (`<3`, `git push`, `404`), a running ASCII coder and a bug.
* **Changing backgrounds** – every image in `static/img/bg/` cross-fades every 9 seconds.
* **Your photos** – put your own pictures in `static/img/people/`; they appear as a rotating polaroid.
  Only use photos of yourself or people who agreed to it.
* **Accounts** – register / log in / log out. Passwords are hashed (PBKDF2 via Werkzeug), forms are
  CSRF-protected, logins are rate-limited, sessions are HttpOnly + SameSite, and a strict
  Content-Security-Policy is sent.
* **Dashboard** – heart meter, live ECG monitor, 7-question quiz. Heart score =
  quiz (max 60) + poem finished (4 per read, max 20) + "I've fallen in love" declaration (20).
  Levels: Cold boot, Compiling..., Warm cache, Heart racing, Fully deployed.
* **WhatsApp** – the "I've fallen in love" buttons open `https://wa.me/256748808436` with a
  pre-written message. `0748808436` is written in international (Uganda +256) form, as wa.me requires.
  Change it with `WHATSAPP_NUMBER=...`.

## Going live

1. Host it on any Python host (Render, Railway, Fly.io, a VPS) or with the Dockerfile.
2. Set `SECRET_KEY` (long random string) and, once you have HTTPS, `COOKIE_SECURE=1`.
3. Keep the `instance/` folder (it holds the SQLite database) on a persistent disk.
4. Back up `instance/love.db` regularly. It stores usernames, emails and password hashes, so
   tell your visitors what you keep, and only keep what you need.

## Regenerate the background art

```bash
pip install -r requirements-assets.txt
python tools/make_assets.py
```
