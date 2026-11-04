"""Love Is Like Coding - Flask backend.

Features
  * Animated poem landing page (static/js/poem.js reads static/data/poem.json)
  * Account sign-up / login / logout (SQLite, hashed passwords, CSRF protection)
  * Dashboard with a "heart status" computed from a short quiz + engagement
  * WhatsApp link generator (wa.me) for visitors who say they have fallen in love
  * JSON APIs that list the background images and your own people photos
"""
import json
import os
import re
import secrets
import sqlite3
import time
import urllib.parse
from functools import wraps

from flask import (Flask, abort, flash, g, jsonify, redirect, render_template,
                   request, session, url_for)
from werkzeug.security import check_password_hash, generate_password_hash

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
INSTANCE_DIR = os.path.join(BASE_DIR, "instance")
os.makedirs(INSTANCE_DIR, exist_ok=True)

DB_PATH = os.environ.get("DB_PATH", os.path.join(INSTANCE_DIR, "love.db"))
# International format, no "+" and no leading zero: 0748808436 -> 256748808436 (Uganda).
WHATSAPP_NUMBER = os.environ.get("WHATSAPP_NUMBER", "256748808436")
IMAGE_EXT = (".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif")


def load_secret_key():
    env = os.environ.get("SECRET_KEY")
    if env:
        return env
    path = os.path.join(INSTANCE_DIR, "secret.key")
    if not os.path.exists(path):
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(secrets.token_hex(32))
    with open(path, encoding="utf-8") as fh:
        return fh.read().strip()


app = Flask(__name__)
app.config.update(
    SECRET_KEY=load_secret_key(),
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("COOKIE_SECURE", "0") == "1",
    PERMANENT_SESSION_LIFETIME=60 * 60 * 24 * 14,
    MAX_CONTENT_LENGTH=64 * 1024,
)

# ----------------------------------------------------------------------------
# Quiz + heart status model
# ----------------------------------------------------------------------------
QUIZ = [
    {"q": "How did the poem make you feel?",
     "a": ["Nothing yet", "It made me smile", "Butterflies", "My heart skipped a beat"]},
    {"q": "Would you read the next chapter?",
     "a": ["Probably not", "Maybe", "Yes", "Right now, please"]},
    {"q": "Is a coder's sense of humour your type?",
     "a": ["Not really", "Sometimes", "Quite a lot", "It's my favourite type"]},
    {"q": "If we met for coffee, you would...",
     "a": ["Stay home", "Say hi and leave early", "Stay for a while", "Lose track of time"]},
    {"q": "Late-night debugging side by side sounds...",
     "a": ["Awful", "Tolerable", "Fun", "Like a date"]},
    {"q": "Your heartbeat right now is...",
     "a": ["Calm", "A bit faster", "Racing", "Off the charts"]},
    {"q": "Ready to send a message?",
     "a": ["No", "Not sure", "Almost", "Yes, opening WhatsApp"]},
]
MAX_QUIZ = len(QUIZ) * 3

LEVELS = [
    (0, "Cold boot", "The system hasn't started yet."),
    (20, "Compiling...", "Something is building. No errors so far."),
    (40, "Warm cache", "Familiar feelings are loading faster."),
    (60, "Heart racing", "CPU at 90%. This is getting serious."),
    (80, "Fully deployed", "In love. Production is live."),
]

# ----------------------------------------------------------------------------
# Database helpers
# ----------------------------------------------------------------------------

def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(_exc):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    with open(os.path.join(BASE_DIR, "schema.sql"), encoding="utf-8") as fh:
        script = fh.read()
    con = sqlite3.connect(DB_PATH)
    try:
        con.executescript(script)
        con.commit()
    finally:
        con.close()


init_db()

# ----------------------------------------------------------------------------
# Security helpers: CSRF, login throttling, auth decorator
# ----------------------------------------------------------------------------
_failures = {}  # key -> [timestamps]
MAX_FAILS, WINDOW = 8, 600


def csrf_token():
    if "csrf" not in session:
        session["csrf"] = secrets.token_urlsafe(32)
    return session["csrf"]


app.jinja_env.globals["csrf_token"] = csrf_token


@app.before_request
def verify_csrf():
    if request.method in ("POST", "PUT", "DELETE", "PATCH"):
        sent = request.headers.get("X-CSRF-Token") or request.form.get("csrf_token", "")
        expected = session.get("csrf", "")
        if not expected or not secrets.compare_digest(sent, expected):
            abort(400, "Invalid CSRF token")


@app.after_request
def security_headers(resp):
    resp.headers.setdefault("X-Content-Type-Options", "nosniff")
    resp.headers.setdefault("X-Frame-Options", "DENY")
    resp.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    resp.headers.setdefault(
        "Content-Security-Policy",
        "default-src 'self'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; "
        "script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; "
        "form-action 'self'")
    return resp


def throttled(key):
    now = time.time()
    hits = [t for t in _failures.get(key, []) if now - t < WINDOW]
    _failures[key] = hits
    return len(hits) >= MAX_FAILS


def record_failure(key):
    _failures.setdefault(key, []).append(time.time())


def login_required(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if not session.get("uid"):
            if request.path.startswith("/api/"):
                return jsonify(error="Please log in first."), 401
            flash("Please log in first.", "warn")
            return redirect(url_for("login", next=request.path))
        return view(*args, **kwargs)
    return wrapped


def current_user():
    uid = session.get("uid")
    if not uid:
        return None
    return get_db().execute("SELECT id, username, email, created_at FROM users WHERE id=?",
                            (uid,)).fetchone()


@app.context_processor
def inject_user():
    return {"user": current_user(), "whatsapp_link": whatsapp_link()}


def safe_next(target):
    """Only allow same-site relative redirects."""
    if target and target.startswith("/") and not target.startswith("//"):
        return target
    return url_for("dashboard")

# ----------------------------------------------------------------------------
# Domain logic
# ----------------------------------------------------------------------------

def whatsapp_link(name=None):
    text = "Hi! I read your 'Love Is Like Coding' poem and I think I've fallen in love"
    if name:
        text = f"Hi! It's {name}. " + text
    text += " ❤️"
    return f"https://wa.me/{WHATSAPP_NUMBER}?text={urllib.parse.quote(text)}"


def compute_status(user_id):
    db = get_db()
    quiz = db.execute("SELECT score, answers, updated_at FROM quiz WHERE user_id=?",
                      (user_id,)).fetchone()
    reads = db.execute("SELECT COUNT(*) c FROM events WHERE user_id=? AND kind='poem_finished'",
                       (user_id,)).fetchone()["c"]
    fell = db.execute("SELECT 1 FROM events WHERE user_id=? AND kind='fell_in_love' LIMIT 1",
                      (user_id,)).fetchone() is not None
    quiz_points = round((quiz["score"] / MAX_QUIZ) * 60) if quiz else 0
    poem_points = min(reads, 5) * 4
    declared_points = 20 if fell else 0
    score = min(100, quiz_points + poem_points + declared_points)
    level = LEVELS[0]
    for lv in LEVELS:
        if score >= lv[0]:
            level = lv
    bpm = 60 + round(score * 0.9)
    return {
        "score": score,
        "level": level[1],
        "message": level[2],
        "bpm": bpm,
        "breakdown": {"quiz": quiz_points, "quiz_max": 60, "poem": poem_points,
                      "poem_max": 20, "declared": declared_points, "declared_max": 20},
        "poem_reads": reads,
        "declared": fell,
        "quiz_answers": json.loads(quiz["answers"]) if quiz else None,
        "quiz_updated": quiz["updated_at"] if quiz else None,
        "whatsapp": whatsapp_link(),
    }


def list_images(subdir):
    folder = os.path.join(BASE_DIR, "static", "img", subdir)
    if not os.path.isdir(folder):
        return []
    names = sorted(f for f in os.listdir(folder) if f.lower().endswith(IMAGE_EXT))
    return [url_for("static", filename=f"img/{subdir}/{n}") for n in names]

# ----------------------------------------------------------------------------
# Pages
# ----------------------------------------------------------------------------
USERNAME_RE = re.compile(r"^[A-Za-z0-9_]{3,24}$")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@app.get("/")
def index():
    return render_template("index.html")


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username", "").strip()
        email = request.form.get("email", "").strip().lower()
        password = request.form.get("password", "")
        errors = []
        if not USERNAME_RE.match(username):
            errors.append("Username must be 3-24 letters, numbers or underscores.")
        if not EMAIL_RE.match(email) or len(email) > 120:
            errors.append("Enter a valid email address.")
        if len(password) < 8 or len(password) > 128:
            errors.append("Password must be 8-128 characters.")
        if not errors:
            db = get_db()
            try:
                cur = db.execute(
                    "INSERT INTO users(username,email,password_hash) VALUES (?,?,?)",
                    (username, email, generate_password_hash(password)))
                db.commit()
            except sqlite3.IntegrityError:
                errors.append("That username or email is already registered.")
            else:
                session.clear()
                session["uid"] = cur.lastrowid
                session.permanent = True
                flash("Account created. Welcome!", "ok")
                return redirect(url_for("dashboard"))
        for e in errors:
            flash(e, "error")
        return render_template("register.html", form=request.form), 400
    return render_template("register.html", form={})


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        ident = request.form.get("identity", "").strip().lower()
        password = request.form.get("password", "")
        key = f"{request.remote_addr}|{ident}"
        if throttled(key):
            flash("Too many attempts. Try again in a few minutes.", "error")
            return render_template("login.html"), 429
        row = get_db().execute(
            "SELECT id, password_hash FROM users WHERE lower(username)=? OR lower(email)=?",
            (ident, ident)).fetchone()
        if row and check_password_hash(row["password_hash"], password):
            session.clear()
            session["uid"] = row["id"]
            session.permanent = True
            db = get_db()
            db.execute("INSERT INTO events(user_id, kind) VALUES (?, 'login')", (row["id"],))
            db.commit()
            return redirect(safe_next(request.args.get("next")))
        record_failure(key)
        flash("Wrong username/email or password.", "error")
        return render_template("login.html"), 401
    return render_template("login.html")


@app.post("/logout")
def logout():
    session.clear()
    flash("Logged out. Come back soon.", "ok")
    return redirect(url_for("index"))


@app.get("/dashboard")
@login_required
def dashboard():
    return render_template("dashboard.html", quiz=QUIZ, status=compute_status(session["uid"]))

# ----------------------------------------------------------------------------
# JSON API
# ----------------------------------------------------------------------------

@app.get("/api/status")
@login_required
def api_status():
    return jsonify(compute_status(session["uid"]))


@app.post("/api/quiz")
@login_required
def api_quiz():
    data = request.get_json(silent=True) or {}
    answers = data.get("answers")
    if (not isinstance(answers, list) or len(answers) != len(QUIZ)
            or not all(isinstance(a, int) and not isinstance(a, bool) and 0 <= a <= 3
                       for a in answers)):
        return jsonify(error="Answer all questions."), 400
    db = get_db()
    db.execute(
        "INSERT INTO quiz(user_id, answers, score, updated_at) VALUES (?,?,?,datetime('now')) "
        "ON CONFLICT(user_id) DO UPDATE SET answers=excluded.answers, score=excluded.score, "
        "updated_at=excluded.updated_at",
        (session["uid"], json.dumps(answers), sum(answers)))
    db.commit()
    return jsonify(compute_status(session["uid"]))


@app.post("/api/event")
@login_required
def api_event():
    kind = (request.get_json(silent=True) or {}).get("kind")
    if kind not in ("poem_finished", "fell_in_love"):
        return jsonify(error="Unknown event."), 400
    db = get_db()
    if kind == "fell_in_love":
        exists = db.execute("SELECT 1 FROM events WHERE user_id=? AND kind=?",
                            (session["uid"], kind)).fetchone()
        if not exists:
            db.execute("INSERT INTO events(user_id, kind) VALUES (?,?)", (session["uid"], kind))
    else:
        db.execute("INSERT INTO events(user_id, kind) VALUES (?,?)", (session["uid"], kind))
    db.commit()
    return jsonify(compute_status(session["uid"]))


@app.get("/api/whatsapp")
def api_whatsapp():
    u = current_user()
    return jsonify(link=whatsapp_link(u["username"] if u else None))


@app.get("/api/backgrounds")
def api_backgrounds():
    return jsonify(images=list_images("bg"))


@app.get("/api/people")
def api_people():
    return jsonify(images=list_images("people"))


@app.get("/healthz")
def healthz():
    get_db().execute("SELECT 1")
    return jsonify(ok=True)


if __name__ == "__main__":
    app.run(host=os.environ.get("HOST", "127.0.0.1"),
            port=int(os.environ.get("PORT", "5000")),
            debug=os.environ.get("FLASK_DEBUG") == "1")
