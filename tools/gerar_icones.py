#!/usr/bin/env python3
"""Gera o logotipo do Rios ZP-1 (icon.svg e PNGs) na paleta do layout TideConversor.

Uso (raiz do repositório):  python3 tools/gerar_icones.py
Saídas: icon.svg, icon-180.png, icon-192.png, icon-512.png, icon-maskable.png
Um só desenho (GEOM) gera o SVG e os PNGs, então todos ficam iguais.
"""
from pathlib import Path
from PIL import Image, ImageDraw

RAIZ = Path(__file__).resolve().parent.parent
FUNDO_A, FUNDO_B = "#2b4a68", "#1c3449"   # azul-marinho do TideConversor (--forest / --deep)
BRANCO, AGUA, OCRE = "#ffffff", "#8ccfd6", "#e0a63e"
SW = 28  # espessura do traço (em 512)

# curvas de Bézier cúbicas (em 512): onda branca, onda clara, setas
ONDA = lambda y: [((96, y), (136, y), (136, y - 32), (176, y - 32)), ((176, y - 32), (216, y - 32), (216, y), (256, y)),
                  ((256, y), (296, y), (296, y - 32), (336, y - 32)), ((336, y - 32), (376, y - 32), (376, y), (416, y))]
GEOM = {
    "onda1": ONDA(316), "onda2": ONDA(400),
    "seta_desce": [((190, 92), (190, 92), (190, 206), (190, 206)), ((148, 164), (148, 164), (190, 206), (190, 206)), ((190, 206), (190, 206), (232, 164), (232, 164))],
    "seta_sobe": [((322, 206), (322, 206), (322, 92), (322, 92)), ((280, 134), (280, 134), (322, 92), (322, 92)), ((322, 92), (322, 92), (364, 134), (364, 134))],
}
PONTO = (256, 246, 15)  # nível de referência (NR): ponto ocre entre as setas e a água


def bez(p, n=40):
    (x0, y0), (x1, y1), (x2, y2), (x3, y3) = p
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        out.append((u**3 * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t**3 * x3, u**3 * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t**3 * y3))
    return out


def d_svg(segs):
    d = f"M{segs[0][0][0]} {segs[0][0][1]}"
    for a, b, c, e in segs:
        if (a, b) == (b, c) == (c, e) or (b == a and c == e):
            d += f"M{a[0]} {a[1]}L{e[0]} {e[1]}"
        else:
            d += f"C{b[0]} {b[1]} {c[0]} {c[1]} {e[0]} {e[1]}"
    return d


def svg():
    tr = lambda cor, k: f'<path d="{d_svg(GEOM[k])}" stroke="{cor}"/>' if k.startswith("onda") else ""
    setas = "".join(f'<path d="M{s[0][0][0]} {s[0][0][1]}L{s[0][3][0]} {s[0][3][1]}M{s[1][0][0]} {s[1][0][1]}L{s[1][3][0]} {s[1][3][1]}L{s[2][3][0]} {s[2][3][1]}"/>' for s in (GEOM["seta_desce"], GEOM["seta_sobe"]))
    # Seta: haste + cabeça em "V" (desenhada com 2 segmentos que partem da ponta)
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{FUNDO_A}"/><stop offset="1" stop-color="{FUNDO_B}"/></linearGradient></defs>'
            f'<rect width="512" height="512" rx="112" fill="url(#g)"/><g fill="none" stroke-width="{SW}" stroke-linecap="round" stroke-linejoin="round">'
            f'<path d="M96 316C136 316 136 284 176 284S216 316 256 316 296 284 336 284 376 316 416 316" stroke="{BRANCO}"/>'
            f'<path d="M96 400C136 400 136 368 176 368S216 400 256 400 296 368 336 368 376 400 416 400" stroke="{AGUA}"/>'
            f'<g stroke="{BRANCO}"><path d="M190 92V206M148 164l42 42 42-42"/><path d="M322 206V92M280 134l42-42 42 42"/></g></g>'
            f'<circle cx="{PONTO[0]}" cy="{PONTO[1]}" r="{PONTO[2]}" fill="{OCRE}" stroke="{FUNDO_B}" stroke-width="7"/></svg>\n')


def hex2rgb(h):
    return tuple(int(h[i:i + 2], 16) for i in (1, 3, 5))


def png(tam, maskable=False):
    S = 4 * 512  # supersampling
    k = S / 512
    im = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    # fundo em gradiente diagonal
    a, b = hex2rgb(FUNDO_A), hex2rgb(FUNDO_B)
    g = Image.new("RGB", (S, S))
    px = g.load()
    for y in range(S):
        for x in range(S):
            t = (x + y) / (2 * S)
            px[x, y] = tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(3))
    m = Image.new("L", (S, S), 0)
    ImageDraw.Draw(m).rounded_rectangle((0, 0, S - 1, S - 1), radius=0 if maskable else 112 * k, fill=255)
    im.paste(g, (0, 0), m)
    fg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(fg)

    def traco(pts, cor):
        r = SW * k / 2
        P = [(x * k, y * k) for x, y in pts]
        for (x0, y0), (x1, y1) in zip(P, P[1:]):
            d.line((x0, y0, x1, y1), fill=cor, width=round(2 * r))
        for x, y in P[::2] + [P[-1]]:
            d.ellipse((x - r, y - r, x + r, y + r), fill=cor)

    def curva(segs):
        pts = []
        for s in segs:
            pts += bez(s)
        return pts
    traco(curva(GEOM["onda1"]), BRANCO)
    traco(curva(GEOM["onda2"]), AGUA)
    for key in ("seta_desce", "seta_sobe"):
        s = GEOM[key]
        traco([s[0][0], s[0][3]], BRANCO)
        traco([s[1][0], s[1][3], s[2][3]], BRANCO)
    x, y, r = PONTO
    d.ellipse(((x - r - 3.5) * k, (y - r - 3.5) * k, (x + r + 3.5) * k, (y + r + 3.5) * k), fill=FUNDO_B)
    d.ellipse(((x - r) * k, (y - r) * k, (x + r) * k, (y + r) * k), fill=OCRE)
    if maskable:  # zona segura: conteúdo a 78 %
        e = 0.78
        fg = fg.resize((round(S * e), round(S * e)), Image.LANCZOS)
        base = Image.new("RGBA", (S, S), (0, 0, 0, 0))
        base.paste(fg, ((S - fg.width) // 2, (S - fg.height) // 2))
        fg = base
    im = Image.alpha_composite(im, fg)
    return im.resize((tam, tam), Image.LANCZOS)


def main():
    (RAIZ / "icon.svg").write_text(svg(), encoding="utf-8")
    for nome, tam, mk in (("icon-180.png", 180, False), ("icon-192.png", 192, False), ("icon-512.png", 512, False), ("icon-maskable.png", 512, True)):
        png(tam, mk).save(RAIZ / nome, optimize=True)
    print("icon.svg, icon-180/192/512.png e icon-maskable.png gerados")


if __name__ == "__main__":
    main()
