"""Compose the five Act VI mission illustrations from existing mission art (development only).

No image model was available when Act VI was written. These pictures are a deliberate fallback:
each one re-frames and re-grades an existing illustration and paints the mission's motif on top
(a pulsing beacon, the pink water convoy, seed cannons, the vault's twelve lights, the first garden).
The prompts in assets/missions/manifest.json describe the intended final artwork for a later
generation with the built-in image tool. Deterministic: running it again reproduces the files.
"""
import math, pathlib
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parents[1]
MISSIONS = ROOT / 'assets/missions'
W, H = 1672, 941


def load(mission_id):
    return np.asarray(Image.open(MISSIONS / f'{mission_id}.webp').convert('RGB'), dtype=np.float32) / 255


def frame(img, zoom=1.0, cx=.5, cy=.5, mirror=False):
    """Crop around (cx, cy) by `zoom` and scale back to the illustration size."""
    h, w = img.shape[:2]
    cw, ch = w / zoom, h / zoom
    x0 = min(max(cx * w - cw / 2, 0), w - cw)
    y0 = min(max(cy * h - ch / 2, 0), h - ch)
    pil = Image.fromarray((img * 255).astype(np.uint8)).crop((int(x0), int(y0), int(x0 + cw), int(y0 + ch))).resize((W, H), Image.LANCZOS)
    if mirror:
        pil = pil.transpose(Image.FLIP_LEFT_RIGHT)
    return np.asarray(pil, dtype=np.float32) / 255


def grade(img, tint=(1, 1, 1), saturation=1.0, contrast=1.0, lift=(0, 0, 0), gamma=1.0):
    luma = img @ np.array([.299, .587, .114], dtype=np.float32)
    out = luma[..., None] + (img - luma[..., None]) * saturation
    out = (out - .5) * contrast + .5
    out = np.clip(out, 0, 1) ** gamma
    out = out * np.array(tint, dtype=np.float32) + np.array(lift, dtype=np.float32)
    return np.clip(out, 0, 1)


def vignette(img, strength=.45):
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    d = np.sqrt(((x - W / 2) / (W / 2)) ** 2 + ((y - H / 2) / (H / 2)) ** 2)
    return img * (1 - strength * np.clip(d - .35, 0, 1)[..., None] ** 1.4)


def screen(base, layer):
    return 1 - (1 - base) * (1 - np.clip(layer, 0, 1))


def glow(draw_fn, radii=(2, 8, 24, 60), weights=(1.0, .8, .55, .35)):
    """Draw shapes on a black canvas and return a bloomed light layer."""
    canvas = Image.new('RGB', (W, H), 'black')
    draw_fn(ImageDraw.Draw(canvas))
    sharp = np.asarray(canvas, dtype=np.float32) / 255
    layer = sharp.copy()
    for radius, weight in zip(radii, weights):
        layer += weight * np.asarray(canvas.filter(ImageFilter.GaussianBlur(radius)), dtype=np.float32) / 255
    return layer


def cells(draw, cells_rc, x, y, size, color, gap=.18):
    for r, c in cells_rc:
        x0, y0 = x + c * size, y + r * size
        draw.rounded_rectangle((x0 + size * gap, y0 + size * gap, x0 + size * (1 - gap), y0 + size * (1 - gap)), radius=size * .22, fill=color)


def particles(rng, count, color, length=(4, 14), angle=.35, width=1, alpha=.9, blur=.8):
    canvas = Image.new('RGB', (W, H), 'black')
    draw = ImageDraw.Draw(canvas)
    for _ in range(count):
        x, y = rng.uniform(0, W), rng.uniform(0, H)
        n = rng.uniform(*length)
        shade = tuple(int(v * rng.uniform(.4, 1) * alpha) for v in color)
        draw.line((x, y, x + n * math.cos(angle), y + n * math.sin(angle)), fill=shade, width=width)
    return np.asarray(canvas.filter(ImageFilter.GaussianBlur(blur)), dtype=np.float32) / 255


def rays(cx, cy, color, count=18, spread=1.0, length=900, seed=1):
    rng = np.random.default_rng(seed)
    canvas = Image.new('RGB', (W, H), 'black')
    draw = ImageDraw.Draw(canvas)
    for i in range(count):
        a = 2 * math.pi * i / count + rng.uniform(-.1, .1)
        w = rng.uniform(.02, .05) * spread
        pts = [(cx, cy), (cx + length * math.cos(a - w), cy + length * math.sin(a - w)), (cx + length * math.cos(a + w), cy + length * math.sin(a + w))]
        draw.polygon(pts, fill=tuple(int(v * rng.uniform(.25, .6)) for v in color))
    layer = np.asarray(canvas.filter(ImageFilter.GaussianBlur(18)), dtype=np.float32) / 255
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    falloff = np.exp(-np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (length * .35))
    return layer * falloff[..., None]


def save(img, mission_id):
    Image.fromarray((np.clip(img, 0, 1) * 255).astype(np.uint8)).save(MISSIONS / f'{mission_id}.webp', 'WEBP', quality=82, method=6)
    print('wrote', mission_id)


GLIDER = [(0, 1), (1, 2), (2, 0), (2, 1), (2, 2)]
LWSS = [(0, 1), (0, 4), (1, 0), (2, 0), (2, 4), (3, 0), (3, 1), (3, 2), (3, 3)]
BEACON = [(0, 0), (0, 1), (1, 0), (1, 1), (2, 2), (2, 3), (3, 2), (3, 3)]
BEEHIVE = [(0, 1), (0, 2), (1, 0), (1, 3), (2, 1), (2, 2)]


def beacon_in_storm():
    """A6_M01: an icy canyon in a white storm, a two-block beacon pulsing above the ice."""
    img = grade(frame(load('A1_M04'), 1.18, .58, .55, mirror=True), tint=(.78, .92, 1.08), saturation=.42, contrast=1.08, lift=(.05, .07, .1))
    img = screen(img, np.full_like(img, (.16, .2, .26)) * np.linspace(1, .25, H, dtype=np.float32)[:, None, None])
    cx, cy = 980, 430
    img = screen(img, rays(cx, cy, (120, 230, 255), count=22, spread=1.3, length=1200, seed=7) * 1.4)
    img = screen(img, glow(lambda d: cells(d, BEACON, cx - 64, cy - 64, 32, (150, 255, 245)), radii=(3, 12, 34, 90), weights=(1, .95, .75, .55)))
    rng = np.random.default_rng(26)
    img = screen(img, particles(rng, 2600, (235, 245, 255), length=(6, 26), angle=.42, width=2, alpha=.75, blur=1.2))
    img = screen(img, particles(rng, 1400, (220, 235, 255), length=(2, 6), angle=.42, width=1, alpha=.6, blur=.5))
    # Two tiny crawler headlights find the beacon through the storm.
    img = screen(img, glow(lambda d: [d.ellipse((x - 4, y - 3, x + 4, y + 3), fill=(255, 236, 190)) for x, y in ((520, 610), (548, 622))], radii=(2, 7, 20), weights=(1, .7, .4)))
    save(vignette(img, .5), 'A6_M01')


def water_convoy():
    """A6_M02: the canyon locks at dawn, a pink Hellas convoy of light gliding along the water."""
    img = grade(frame(load('A2_M02'), 1.12, .45, .58), tint=(1.06, .92, 1.02), saturation=.9, contrast=1.05, lift=(.03, .0, .03))
    # The convoy travels upstream along the river; its wake is a trail of pink light.
    path = [(985 + 4 * i, 900 - 30 * i) for i in range(12)]
    def convoy(d):
        for i, (x, y) in enumerate(path[:-1]):
            r = 2 + i * .35
            d.ellipse((x - r, y - r * .6, x + r, y + r * .6), fill=(255, 90 + 6 * i, 200))
        x, y = path[-1]
        cells(d, LWSS, x - 44, y - 40, 20, (255, 110, 215))
    img = screen(img, glow(convoy, radii=(2, 9, 26, 70), weights=(1, .9, .65, .45)))
    rng = np.random.default_rng(27)
    img = screen(img, particles(rng, 900, (255, 200, 235), length=(1, 3), angle=-.3, alpha=.45, blur=1.1))
    # Two grey frozen nests further up the channel, shown as pale still lifes.
    img = screen(img, glow(lambda d: [cells(d, BEEHIVE, x, y, 9, (175, 185, 195)) for x, y in ((1150, 440), (1175, 375))], radii=(1, 5, 14), weights=(.8, .5, .3)))
    save(vignette(img, .42), 'A6_M02')


def seed_cannons():
    """A6_M03: two old towers at dusk firing streams of grey seed gliders towards a red canal."""
    img = grade(frame(load('A2_M04'), 1.1, .55, .48), tint=(1.08, .9, .76), saturation=.78, contrast=1.06, lift=(.04, .02, 0))
    def streams(d):
        for (sx, sy, dx) in ((850, 230, -1), (1230, 260, 1)):
            for i in range(1, 9):
                x, y = sx + dx * i * 70, sy + i * 62
                pattern = GLIDER if dx > 0 else [(r, 2 - c) for r, c in GLIDER]
                cells(d, pattern, x, y, 9 + i * 1.6, (210, 214, 220))
    img = screen(img, glow(streams, radii=(1, 6, 18, 40), weights=(1, .7, .45, .25)))
    # The drinking water canal at the foot of the cliffs glows red: no flora may touch it.
    band = np.exp(-((np.arange(H, dtype=np.float32) - 905) / 26) ** 2)[:, None, None] * np.array((.55, .08, .12), dtype=np.float32)
    img = screen(img, np.broadcast_to(band, img.shape) * (.75 + .25 * np.sin(np.arange(W, dtype=np.float32) / 37))[None, :, None])
    rng = np.random.default_rng(28)
    img = screen(img, particles(rng, 1600, (255, 190, 120), length=(2, 9), angle=.12, alpha=.35, blur=1.4))
    save(vignette(img, .45), 'A6_M03')


def seed_vault():
    """A6_M04: the sealed vault door below the first landing site, ringed by twelve warm lights."""
    img = grade(frame(load('A3_M01'), 1.55, .69, .58), tint=(1.1, .96, .78), saturation=.82, contrast=1.1, lift=(.03, .02, 0))
    cx, cy, radius = 1005, 455, 265
    def ring(d):
        for i in range(12):
            a = -math.pi / 2 + 2 * math.pi * i / 12
            x, y = cx + radius * math.cos(a), cy + radius * math.sin(a)
            d.ellipse((x - 9, y - 9, x + 9, y + 9), fill=(255, 214, 130))
    img = screen(img, glow(ring, radii=(2, 8, 22, 55), weights=(1, .85, .6, .35)))
    img = screen(img, rays(cx, cy, (255, 200, 120), count=12, spread=.8, length=700, seed=12) * .5)
    # Rows of sealed seed capsules on the shelves of the vault floor.
    img = screen(img, glow(lambda d: [cells(d, BEEHIVE, 150 + col * 82 + row * 30, 760 + row * 58, 7, (70, 150, 135)) for row in range(2) for col in range(4)], radii=(1, 6, 16), weights=(.6, .4, .25)))
    save(vignette(img, .5), 'A6_M04')


def first_spring():
    """A6_M05: the landing site in morning light, sprouts of all four houses in raised beds."""
    img = grade(frame(load('A1_M01'), 1.08, .5, .62, mirror=True), tint=(1.04, 1.03, .95), saturation=1.05, contrast=1.02, lift=(.03, .04, .02), gamma=.93)
    img = screen(img, rays(1290, 120, (255, 220, 170), count=20, spread=1.4, length=1500, seed=30) * .55)
    rng = np.random.default_rng(30)
    # Seedlings of all four houses sprout between the stones: soft points of light in the soil.
    def sprouts(d):
        for x, y, color in ((300, 820, (0, 230, 230)), (640, 860, (70, 235, 60)), (980, 835, (240, 60, 220)), (1330, 800, (235, 225, 40)), (820, 720, (70, 235, 60)), (470, 700, (240, 60, 220)), (1150, 690, (0, 230, 230)), (1500, 880, (70, 235, 60))):
            for _ in range(11):
                sx, sy, r = x + rng.normal(0, 46), y + rng.normal(0, 16), rng.uniform(3.5, 9)
                d.ellipse((sx - r, sy - r, sx + r, sy + r), fill=tuple(int(v * rng.uniform(.6, 1)) for v in color))
    img = screen(img, glow(sprouts, radii=(1, 6, 20, 52), weights=(1, .8, .55, .35)))
    # A warm green breath of morning over the new beds.
    y, x = np.mgrid[0:H, 0:W].astype(np.float32)
    img = screen(img, (np.exp(-(((x - 820) / 700) ** 2 + ((y - 820) / 160) ** 2))[..., None] * np.array((.1, .16, .06), dtype=np.float32)))
    img = screen(img, particles(rng, 700, (255, 240, 200), length=(1, 3), angle=-.6, alpha=.55, blur=1.6))
    save(vignette(img, .38), 'A6_M05')


if __name__ == '__main__':
    beacon_in_storm()
    water_convoy()
    seed_cannons()
    seed_vault()
    first_spring()
