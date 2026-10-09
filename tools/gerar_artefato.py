#!/usr/bin/env python3
"""Gera artefato/index.html: o app inteiro em um só arquivo (CSS, JS e dados embutidos).
No artefato, o app tenta ler data.json do GitHub Pages e cai nos dados embutidos se não conseguir."""
import json, re
from pathlib import Path
R = Path(__file__).resolve().parent.parent
h = (R / "index.html").read_text(encoding="utf-8")
css = (R / "styles.css").read_text(encoding="utf-8")
js = (R / "app.js").read_text(encoding="utf-8").replace("</script", "<\\/script")
dados = (R / "data.json").read_text(encoding="utf-8")
h = re.sub(r'<link rel="(manifest|apple-touch-icon|icon)"[^>]*>\n?', "", h)
h = re.sub(r'<meta property="og:[^>]*>\n?|<meta name="twitter:[^>]*>\n?', "", h)
h = re.sub(r'<link rel="stylesheet" href="styles.css[^"]*">', lambda m: "<style>" + css + "</style>", h)
boot = "<script>window.__ZP1__={url:'https://maregrafista.github.io/Rios-ZP-1/data.json',dados:" + dados.replace("</", "<\\/") + "};</script>\n<script>" + js + "</script>"
h = re.sub(r'<script defer src="app.js[^"]*"></script>', "", h)
h = h.replace("</body>", boot + "\n</body>")
h = h.replace("files/", "https://maregrafista.github.io/Rios-ZP-1/files/")
# o Artifact já embrulha a página: manter só título, <style> e corpo
h = re.sub(r"<title>.*?</title>", "<title>Rios ZP-1</title>", h, flags=re.S)
tit = re.search(r"<title>.*?</title>", h).group(0)
sty = re.search(r"<style>.*?</style>", h, flags=re.S).group(0)
corpo = re.search(r"<body[^>]*>(.*?)</body>", h, flags=re.S).group(1)
corpo = re.sub(r"<script>try\{var t=localStorage.*?</script>\n?", "", corpo)
h = '<meta charset="utf-8">\n' + tit + "\n" + sty + "\n" + corpo
(R / "artefato").mkdir(exist_ok=True)
(R / "artefato" / "index.html").write_text(h, encoding="utf-8")
print("artefato/index.html", len(h) // 1024, "KB")
