#!/usr/bin/env python3
"""Logo d'Anyem (icône de bureau, onglet du navigateur) : le « A » de la police du titre
(FantasyRPGtitle, dessiné à la main ci-dessous, 7 × 7 pixels) en or, sur une vignette de nuit
éclairée par un feu de camp, avec des lucioles. Pixel art dessiné en 32 × 32 (et en 16 × 16
pour les petites tailles), agrandi sans lissage.

Usage : python3 tools/logo.py  →  assets/logo/anyem_32.png, anyem_16.png, anyem_256.png,
dist/anyem.ico (16, 24, 32, 48, 64, 128, 256 px) et assets/logo/favicon.png (64 px).
"""
import os
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A = ["..###..", ".##..#.", ".##..#.", ".#####.", ".##..#.", ".##..#.", "##....#"]

def hx(h, a=255):
    h = h.lstrip('#')
    return (int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16), a)

def mix(c1, c2, t):
    return tuple(round(c1[i] + (c2[i] - c1[i]) * t) for i in range(4))

GOLD = [hx('#fff4c8'), hx('#ffe08a'), hx('#f3c45a'), hx('#e0a13a'), hx('#b8741f'), hx('#8a5214')]
OUTLINE = hx('#1c0e05')
SHADOW = hx('#05060f', 200)

def glyph_mask(scale):
    cells = set()
    for y, row in enumerate(A):
        for x, ch in enumerate(row):
            if ch == '#':
                for dy in range(scale):
                    for dx in range(scale):
                        cells.add((x * scale + dx, y * scale + dy))
    return cells

def draw(size, scale, frame):
    im = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    px = im.load()
    r = 4 if size >= 32 else 2  # coins arrondis

    def inside(x, y):
        if not (0 <= x < size and 0 <= y < size):
            return False
        cx0 = r if x < r else size - r if x >= size - r else None
        cy0 = r if y < r else size - r if y >= size - r else None
        if cx0 is None or cy0 is None:
            return True
        return (x + 0.5 - cx0) ** 2 + (y + 0.5 - cy0) ** 2 <= r * r
    top, bottom, fire = hx('#1b2150'), hx('#0a0b1a'), hx('#ff8a2a')
    cx, cy = size / 2, size * 0.95
    for y in range(size):
        for x in range(size):
            if not inside(x, y):
                continue
            c = mix(top, bottom, y / (size - 1))
            d = ((x + 0.5 - cx) ** 2 + ((y + 0.5 - cy) * 1.3) ** 2) ** 0.5 / (size * 0.62)
            glow = max(0.0, 1 - d) ** 1.6 * 0.85
            c = mix(c, fire, glow)
            # étoiles discrètes en haut
            px[x, y] = c
    if frame:
        # liseré or sombre puis or clair
        for y in range(size):
            for x in range(size):
                if not inside(x, y):
                    continue
                edge = not (inside(x - 1, y) and inside(x + 1, y) and inside(x, y - 1) and inside(x, y + 1))
                if edge:
                    px[x, y] = hx('#6b4518')
                elif not (inside(x - 2, y) and inside(x + 2, y) and inside(x, y - 2) and inside(x, y + 2)):
                    px[x, y] = mix(px[x, y], hx('#d8a64a'), 0.55)
    # lucioles
    flies = [(0.2, 0.3), (0.82, 0.22), (0.14, 0.72), (0.86, 0.66), (0.7, 0.12)] if size >= 32 else [(0.16, 0.25), (0.84, 0.3)]
    for fx, fy in flies:
        x, y = int(fx * size), int(fy * size)
        px[x, y] = hx('#e6ff9a')
        if size >= 32:
            for ddx, ddy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                px[x + ddx, y + ddy] = mix(px[x + ddx, y + ddy], hx('#b8ff6a'), 0.35)
    # le A : ombre, contour, or dégradé avec reflet
    cells = glyph_mask(scale)
    gw = 7 * scale
    ox = (size - gw) // 2 + (0 if size >= 32 else 0)
    oy = (size - gw) // 2 - (1 if size >= 32 else 0)
    cells = {(x + ox, y + oy) for x, y in cells}
    ring = set()
    for x, y in cells:
        for ddx in (-1, 0, 1):
            for ddy in (-1, 0, 1):
                p = (x + ddx, y + ddy)
                if p not in cells:
                    ring.add(p)
    for x, y in ring | cells:
        if (x, y + 2) not in cells and (x, y + 2) not in ring and 0 <= y + 2 < size and inside(x, y + 2):
            px[x, y + 2] = mix(px[x, y + 2], SHADOW, 0.7)
    for x, y in ring:
        if 0 <= x < size and 0 <= y < size:
            px[x, y] = OUTLINE
    for x, y in cells:
        t = (y - oy) / max(1, gw - 1)
        c = GOLD[min(len(GOLD) - 1, int(t * len(GOLD)))]
        if (x - 1, y) not in cells or (x, y - 1) not in cells:
            c = mix(c, hx('#ffffff'), 0.35)  # reflet sur les bords hauts / gauches
        px[x, y] = c
    return im

def main():
    out = os.path.join(ROOT, 'assets', 'logo')
    os.makedirs(out, exist_ok=True)
    big = draw(32, 3, True)
    small = draw(16, 2, False)
    big.save(os.path.join(out, 'anyem_32.png'))
    small.save(os.path.join(out, 'anyem_16.png'))
    up = lambda im, n: im.resize((n, n), Image.NEAREST)
    up(big, 256).save(os.path.join(out, 'anyem_256.png'))
    up(big, 64).save(os.path.join(out, 'favicon.png'))
    os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
    frames = [small, up(small, 24) if False else up(big, 24) if False else up(small, 32).resize((24, 24), Image.NEAREST)]
    icons = {16: small, 24: frames[1], 32: big, 48: big.resize((48, 48), Image.NEAREST), 64: up(big, 64), 128: up(big, 128), 256: up(big, 256)}
    icons[256].save(os.path.join(ROOT, 'dist', 'anyem.ico'), format='ICO', sizes=[(s, s) for s in icons],
                    append_images=[icons[s] for s in icons if s != 256])
    print('logo écrit')

if __name__ == '__main__':
    main()
