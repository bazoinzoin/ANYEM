"""Variantes recolorées d'icônes de la planche Raven Fantasy (assets/icons/raven16.png).

Les icônes rouges (sang, cœur…) sont réservées au Scarifié : les soins des autres classes
utilisent des versions dorées et lumineuses, ajoutées en bas de la planche (à partir de la
ligne ORIGINAL_ROWS). Relancer ce script est sans danger : il repart de la planche d'origine.

Usage : python3 tools/recolor_icons.py   (puis npm run build)
"""
import colorsys
from pathlib import Path

from PIL import Image

SHEET = Path(__file__).resolve().parent.parent / 'assets' / 'icons' / 'raven16.png'
ORIGINAL_ROWS = 137  # lignes de la planche achetée
COLS = 16

# (icône d'origine, teinte cible 0-1, luminosité ajoutée) → index = ORIGINAL_ROWS * COLS + rang
RECOLORS = [
    (1057, 0.13, 0.18),  # croissant de soin → or
    (658, 0.14, 0.15),   # cœur (Régénération) → or pâle
    (96, 0.13, 0.12),    # livre (Prêcheur) → or
]


def recolor(tile, hue, lift):
    out = tile.copy()
    px = out.load()
    for y in range(tile.height):
        for x in range(tile.width):
            r, g, b, a = px[x, y]
            if not a:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if s > 0.25 and (h < 0.08 or h > 0.85):  # rouges et roses seulement
                h = hue
                s = s * 0.85
                v = min(1, v + lift)
            r, g, b = (round(c * 255) for c in colorsys.hsv_to_rgb(h, s, v))
            px[x, y] = (r, g, b, a)
    return out


def main():
    sheet = Image.open(SHEET).convert('RGBA')
    base = sheet.crop((0, 0, COLS * 16, ORIGINAL_ROWS * 16))
    extra_rows = (len(RECOLORS) + COLS - 1) // COLS
    out = Image.new('RGBA', (COLS * 16, (ORIGINAL_ROWS + extra_rows) * 16))
    out.paste(base, (0, 0))
    for i, (src, hue, lift) in enumerate(RECOLORS):
        tile = base.crop(((src % COLS) * 16, (src // COLS) * 16, (src % COLS) * 16 + 16, (src // COLS) * 16 + 16))
        n = ORIGINAL_ROWS * COLS + i
        out.paste(recolor(tile, hue, lift), ((n % COLS) * 16, (n // COLS) * 16))
    out.save(SHEET)
    print(f'{SHEET.name} : {len(RECOLORS)} variantes (index {ORIGINAL_ROWS * COLS} à {ORIGINAL_ROWS * COLS + len(RECOLORS) - 1})')


if __name__ == '__main__':
    main()
