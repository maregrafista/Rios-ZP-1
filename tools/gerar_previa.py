#!/usr/bin/env python3
"""Regera preview.png (imagem de prévia do link no WhatsApp) com o hidrograma de Manaus de data.json."""
import json, datetime as dt
from pathlib import Path
RAIZ = Path(__file__).resolve().parent.parent


def main():
    try:
        from PIL import Image, ImageDraw, ImageFont
    except ImportError:
        print("Pillow ausente: preview.png não regerada."); return 0
    d = json.load(open(RAIZ / "data.json", encoding="utf-8"))
    e = next(x for x in d["estacoes"] if x["id"] == "manaus")
    W, H = 1200, 630
    im = Image.new("RGB", (W, H), "#0b1f4d"); dr = ImageDraw.Draw(im)
    for y in range(H):
        t = y / H; dr.line([(0, y), (W, y)], fill=(int(11 + 19 * t), int(31 + 48 * t), int(77 + 86 * t)))

    def font(sz, b=True):
        for p in ["/System/Library/Fonts/Supplemental/Arial Bold.ttf" if b else "/System/Library/Fonts/Supplemental/Arial.ttf", "/System/Library/Fonts/Helvetica.ttc", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"]:
            try: return ImageFont.truetype(p, sz)
            except Exception: pass
        return ImageFont.load_default()
    dr.text((70, 70), "Rios ZP-1", font=font(96), fill="white")
    dr.text((74, 190), "Nível e previsão dos rios da Zona de Praticagem 1", font=font(36, False), fill=(220, 230, 250))
    dr.text((74, 240), "Manaus · Itacoatiara · Parintins · Juruti · Óbidos", font=font(26, False), fill=(180, 200, 235))
    dr.text((74, 278), "Santarém · Oriximiná · Porto Trombetas", font=font(26, False), fill=(180, 200, 235))
    ini = dt.date.fromisoformat(e["ini"]).toordinal(); v = e["v"]; n = len(v)
    obs = [(ini + i, x) for i, x in enumerate(v) if x is not None and i >= n - 150]
    f = [(ini + n - 1 + h, x) for h, x in enumerate(e["prev"]["f"]) if x is not None]
    allv = [x for _, x in obs + f]; lo, hi = min(allv), max(allv); x0, x1 = obs[0][0], f[-1][0]
    X = lambda a: 70 + (a - x0) / (x1 - x0) * (W - 140); Y = lambda b: 590 - (b - lo) / (hi - lo) * 210
    dr.line([(X(a), Y(b)) for a, b in obs], fill="white", width=7, joint="curve")
    pts = [(X(a), Y(b)) for a, b in f]
    for i in range(0, len(pts) - 1, 2): dr.line([pts[i], pts[i + 1]], fill="#ff9a3c", width=7)
    im.save(RAIZ / "preview.png", optimize=True)
    print("preview.png regerada")
    return 0


if __name__ == "__main__":
    main()
