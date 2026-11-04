import os
import re
import sys
import tempfile
import unittest

_tmp = tempfile.mkdtemp()
os.environ["DB_PATH"] = os.path.join(_tmp, "test.db")
os.environ["SECRET_KEY"] = "test-secret"
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app as love  # noqa: E402


def token(client, path="/"):
    html = client.get(path).get_data(as_text=True)
    return re.search(r'name="csrf-token" content="([^"]+)"', html).group(1)


class LoveTests(unittest.TestCase):
    def setUp(self):
        self.c = love.app.test_client()

    def register(self, name="ann", email="ann@example.com", pw="supersecret1"):
        t = token(self.c, "/register")
        return self.c.post("/register", data={"csrf_token": t, "username": name, "email": email, "password": pw})

    def test_pages_load(self):
        for path in ("/", "/login", "/register", "/healthz", "/api/backgrounds", "/api/people"):
            self.assertEqual(self.c.get(path).status_code, 200, path)

    def test_whatsapp_number(self):
        link = self.c.get("/api/whatsapp").get_json()["link"]
        self.assertTrue(link.startswith("https://wa.me/256748808436?text="))

    def test_csrf_required(self):
        self.assertEqual(self.c.post("/login", data={"identity": "x", "password": "y"}).status_code, 400)

    def test_register_login_dashboard_flow(self):
        r = self.register("bob", "bob@example.com")
        self.assertEqual(r.status_code, 302)
        self.assertEqual(self.c.get("/dashboard").status_code, 200)
        t = token(self.c, "/dashboard")
        self.c.post("/logout", data={"csrf_token": t})
        self.assertEqual(self.c.get("/dashboard").status_code, 302)
        t = token(self.c, "/login")
        bad = self.c.post("/login", data={"csrf_token": t, "identity": "bob", "password": "nope"})
        self.assertEqual(bad.status_code, 401)
        ok = self.c.post("/login", data={"csrf_token": t, "identity": "BOB@example.com", "password": "supersecret1"})
        self.assertEqual(ok.status_code, 302)

    def test_duplicate_and_validation(self):
        self.register("carl", "carl@example.com")
        c2 = love.app.test_client()
        t = token(c2, "/register")
        dup = c2.post("/register", data={"csrf_token": t, "username": "carl", "email": "x@example.com", "password": "supersecret1"})
        self.assertEqual(dup.status_code, 400)
        weak = c2.post("/register", data={"csrf_token": t, "username": "ok_name", "email": "bad", "password": "123"})
        self.assertEqual(weak.status_code, 400)

    def test_heart_status_math(self):
        self.register("dana", "dana@example.com")
        t = token(self.c, "/dashboard")
        h = {"X-CSRF-Token": t}
        s = self.c.post("/api/quiz", json={"answers": [3] * 7}, headers=h).get_json()
        self.assertEqual(s["score"], 60)
        self.assertEqual(s["level"], "Heart racing")
        s = self.c.post("/api/event", json={"kind": "fell_in_love"}, headers=h).get_json()
        self.assertEqual(s["score"], 80)
        self.assertEqual(s["level"], "Fully deployed")
        for _ in range(7):
            s = self.c.post("/api/event", json={"kind": "poem_finished"}, headers=h).get_json()
        self.assertEqual(s["score"], 100)  # poem points cap at 20
        self.assertEqual(self.c.post("/api/quiz", json={"answers": [9] * 7}, headers=h).status_code, 400)
        self.assertEqual(self.c.post("/api/event", json={"kind": "hack"}, headers=h).status_code, 400)

    def test_api_requires_login(self):
        c = love.app.test_client()
        t = token(c, "/")
        self.assertEqual(c.get("/api/status").status_code, 401)
        self.assertEqual(c.post("/api/event", json={"kind": "poem_finished"}, headers={"X-CSRF-Token": t}).status_code, 401)

    def test_open_redirect_blocked(self):
        self.register("erin", "erin@example.com")
        t = token(self.c, "/dashboard")
        self.c.post("/logout", data={"csrf_token": t})
        t = token(self.c, "/login")
        r = self.c.post("/login?next=//evil.com", data={"csrf_token": t, "identity": "erin", "password": "supersecret1"})
        self.assertNotIn("evil.com", r.headers["Location"])


if __name__ == "__main__":
    unittest.main()
