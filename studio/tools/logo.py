# Logo d'Onde Studio : carré arrondi dégradé bleu → violet et onde blanche.
# Génère assets/logo.png (512 px) et desktop/onde-studio.ico (icône Windows, plusieurs tailles).
# Usage (dans studio/) : python3 tools/logo.py
import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
S = 1024


def logo(size=S):
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    grad = Image.new('RGBA', (size, size))
    px = grad.load()
    a, b = (79, 156, 249), (167, 123, 243)
    for y in range(size):
        for x in range(size):
            t = (x + y) / (2 * size)
            px[x, y] = tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3)) + (255,)
    mask = Image.new('L', (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([size * 0.04, size * 0.04, size * 0.96, size * 0.96], radius=size * 0.22, fill=255)
    img.paste(grad, (0, 0), mask)
    # Onde : sinusoïde amortie aux deux bords
    pts = []
    for i in range(4001):
        u = i / 4000
        x = size * (0.16 + 0.68 * u)
        env = math.sin(math.pi * u) ** 1.4
        y = size * 0.5 - size * 0.24 * env * math.sin(u * math.pi * 6)
        pts.append((x, y))
    line = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(line)
    # Trait lisse : un disque posé tous les quelques pixels le long de la courbe.
    r = size * 0.0275
    for p in pts:
        d.ellipse([p[0] - r, p[1] - r, p[0] + r, p[1] + r], fill=(255, 255, 255, 255))
    shadow = line.filter(ImageFilter.GaussianBlur(size * 0.02))
    shadow = Image.eval(shadow, lambda v: v // 3)
    img.alpha_composite(shadow, (0, int(size * 0.012)))
    img.alpha_composite(line)
    return img


big = logo()
(ROOT / 'assets').mkdir(exist_ok=True)
big.resize((512, 512), Image.LANCZOS).save(ROOT / 'assets' / 'logo.png')
big.resize((256, 256), Image.LANCZOS).save(ROOT / 'desktop' / 'onde-studio.ico', sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
print('Écrit : assets/logo.png, desktop/onde-studio.ico')
