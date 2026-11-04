"""Generate the animated-background artwork (procedural, no downloads needed).

    python tools/make_assets.py

Creates 1920x1080 JPEGs in static/img/bg/. Add or delete files there freely;
the site picks up whatever is in that folder.
"""
import math
import os
import random

from PIL import Image, ImageDraw, ImageFilter

W, H = 1920, 1080
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "static", "img", "bg")
os.makedirs(OUT, exist_ok=True)


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def gradient(top, bottom):
    img = Image.new("RGB", (W, H))
    d = ImageDraw.Draw(img)
    for y in range(H):
        d.line([(0, y), (W, y)], fill=lerp(top, bottom, y / (H - 1)))
    return img


def stars(img, n, seed):
    rnd = random.Random(seed)
    d = ImageDraw.Draw(img)
    for _ in range(n):
        x, y = rnd.randrange(W), rnd.randrange(int(H * 0.75))
        r = rnd.choice([1, 1, 1, 2])
        c = rnd.randint(170, 255)
        d.ellipse([x - r, y - r, x + r, y + r], fill=(c, c, 255))
    return img


def glow_layer(draw_fn, blur):
    layer = Image.new("RGB", (W, H), (0, 0, 0))
    draw_fn(ImageDraw.Draw(layer))
    return layer.filter(ImageFilter.GaussianBlur(blur))


def screen(base, layer):
    from PIL import ImageChops
    return ImageChops.screen(base, layer)


def heart_points(cx, cy, size):
    pts = []
    for i in range(0, 361, 3):
        t = math.radians(i)
        x = 16 * math.sin(t) ** 3
        y = 13 * math.cos(t) - 5 * math.cos(2 * t) - 2 * math.cos(3 * t) - math.cos(4 * t)
        pts.append((cx + x * size, cy - y * size))
    return pts


def night_city():
    rnd = random.Random(1)
    img = gradient((14, 10, 38), (120, 40, 100))
    stars(img, 220, 11)
    d = ImageDraw.Draw(img)
    d.ellipse([1380, 120, 1500, 240], fill=(255, 240, 215))
    x = 0
    while x < W:
        w = rnd.randint(70, 170)
        h = rnd.randint(180, 620)
        shade = rnd.randint(10, 26)
        d.rectangle([x, H - h, x + w, H], fill=(shade, shade, shade + 14))
        for wy in range(H - h + 18, H - 14, 30):
            for wx in range(x + 12, x + w - 14, 24):
                if rnd.random() < 0.42:
                    d.rectangle([wx, wy, wx + 9, wy + 14], fill=rnd.choice([(255, 214, 120), (255, 170, 90), (150, 220, 255)]))
        x += w + rnd.randint(0, 8)
    return img


def aurora():
    img = gradient((4, 8, 28), (10, 30, 50))
    stars(img, 380, 22)

    def bands(d):
        for k, col in enumerate([(40, 255, 160), (120, 90, 255), (255, 80, 170)]):
            for off in range(0, 90, 6):
                pts = [(x, 300 + k * 90 + off + 70 * math.sin(x / 260 + k * 1.7) + 30 * math.sin(x / 90 + k)) for x in range(0, W + 20, 20)]
                d.line(pts, fill=tuple(int(c * (1 - off / 130)) for c in col), width=10)
    img = screen(img, glow_layer(bands, 26))
    d = ImageDraw.Draw(img)
    d.polygon([(0, H), (0, 860)] + [(x, 860 - 120 * abs(math.sin(x / 210)) - 40 * math.sin(x / 57)) for x in range(0, W + 20, 20)] + [(W, H)], fill=(6, 10, 18))
    return img


def sunset_hills():
    img = gradient((255, 140, 100), (60, 30, 90))
    sun = glow_layer(lambda d: d.ellipse([W // 2 - 180, 360, W // 2 + 180, 720], fill=(255, 210, 120)), 40)
    img = screen(img, sun)
    d = ImageDraw.Draw(img)
    for i, col in enumerate([(120, 50, 100), (80, 36, 90), (50, 24, 70), (24, 14, 44)]):
        base = 640 + i * 110
        pts = [(x, base - 60 * math.sin(x / (300 - i * 40) + i) - 25 * math.sin(x / (90 + i * 10))) for x in range(0, W + 20, 20)]
        d.polygon(pts + [(W, H), (0, H)], fill=col)
    return img


def synthwave():
    img = gradient((12, 4, 36), (70, 10, 90))
    d = ImageDraw.Draw(img)
    cx, cy, r = W // 2, 520, 230
    for y in range(cy - r, cy + r):
        t = (y - (cy - r)) / (2 * r)
        half = math.sqrt(max(r * r - (y - cy) ** 2, 0))
        if int(t * 24) % 3 == 2 and t > 0.45:
            continue
        d.line([(cx - half, y), (cx + half, y)], fill=lerp((255, 220, 90), (255, 60, 150), t))
    d.rectangle([0, 600, W, H], fill=(14, 4, 34))
    grid = Image.new("RGB", (W, H), (0, 0, 0))
    g = ImageDraw.Draw(grid)
    for i in range(-30, 31):
        g.line([(cx + i * 30, 600), (cx + i * 160, H)], fill=(255, 60, 200), width=2)
    for k in range(1, 14):
        y = 600 + (k / 13) ** 2.1 * (H - 600)
        g.line([(0, y), (W, y)], fill=(80, 220, 255), width=2)
    img = screen(img, grid.filter(ImageFilter.GaussianBlur(1.2)))
    return screen(img, grid.filter(ImageFilter.GaussianBlur(8)))


def bokeh():
    rnd = random.Random(5)
    img = gradient((20, 8, 34), (60, 14, 52))
    layer = Image.new("RGB", (W, H), (0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(70):
        r = rnd.randint(25, 110)
        x, y = rnd.randrange(W), rnd.randrange(H)
        col = rnd.choice([(255, 100, 140), (255, 190, 110), (190, 120, 255), (255, 140, 200)])
        d.ellipse([x - r, y - r, x + r, y + r], fill=tuple(int(c * rnd.uniform(0.25, 0.6)) for c in col))
    return screen(img, layer.filter(ImageFilter.GaussianBlur(9)))


def heart_nebula():
    img = gradient((6, 6, 22), (30, 8, 40))
    stars(img, 320, 77)
    outer = glow_layer(lambda d: d.polygon(heart_points(W // 2, H // 2 - 20, 26), outline=(255, 70, 130), width=18), 30)
    inner = glow_layer(lambda d: d.polygon(heart_points(W // 2, H // 2 - 20, 26), outline=(255, 170, 200), width=5), 4)
    return screen(screen(img, outer), inner)


SCENES = {
    "01-night-city": night_city,
    "02-aurora": aurora,
    "03-sunset-hills": sunset_hills,
    "04-synthwave": synthwave,
    "05-bokeh": bokeh,
    "06-heart-nebula": heart_nebula,
}

if __name__ == "__main__":
    for name, fn in SCENES.items():
        path = os.path.join(OUT, name + ".jpg")
        fn().save(path, "JPEG", quality=88, optimize=True)
        print("wrote", path, os.path.getsize(path) // 1024, "KB")
