#!/usr/bin/env python3
"""Lança leituras avulsas de régua: estação, régua (m) e data, em qualquer ordem.

Uso:
    python3 tools/lancar.py "Manaus, 25 m, 10/12/2025"        # lança e recalcula o app
    python3 tools/lancar.py "10/12/2025 25,3 Santarém" "Juruti 3.1m 11/12/25"
    python3 tools/lancar.py                                   # processa as linhas de dados/lancamentos.txt
    opções: --simular  só mostra como entendeu, sem gravar

Formatos aceitos (vírgulas opcionais; as 6 ordens funcionam):
    estação: nome sem acento/maiúsculas; basta o começo (ex.: "porto", "itaco")
    régua:   25 | 25 m | 25,3 | 25.30m | -0,4 m
    data:    10/12/2025 | 10-12-25 | 10.12.2025 | 10/12 (ano atual); hora opcional 14:30
Grava em dados/base/leituras.json (substitui o valor do mesmo dia) e recalcula data.json.
"""
import sys, re, json, unicodedata, subprocess, datetime as dt
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BASE = RAIZ / "dados" / "base"
FILA = RAIZ / "dados" / "lancamentos.txt"
CAB = "# Uma leitura por linha: estação, régua e data em qualquer ordem. Ex.: Manaus, 25 m, 10/12/2025\n# O robô de atualização lê estas linhas, lança no app e as move para dados/base/lancamentos_log.txt.\n"


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s)) if unicodedata.category(c) != "Mn").strip().lower()


RE_DATA = re.compile(r"(?<!\d)(\d{1,2})[/.\-](\d{1,2})(?:[/.\-](\d{2,4}))?(?!\d)")
RE_HORA = re.compile(r"(?<!\d)(\d{1,2}):(\d{2})(?!\d)")
RE_REG = re.compile(r"(?<![\w/.:])(-?\d+(?:[.,]\d+)?)\s*m?(?![\w/.:])", re.I)


def entender(linha, estacoes, hoje=None):
    """Devolve (estação, régua_m, data_iso, hora|None) ou levanta ValueError com a explicação."""
    hoje = hoje or dt.date.today()
    t = linha.strip()
    if not t:
        raise ValueError("linha vazia")
    hora = None
    m = RE_HORA.search(t)
    if m:
        hora = f"{int(m.group(1)):02d}:{m.group(2)}"; t = t[:m.start()] + " " + t[m.end():]
    datas = list(RE_DATA.finditer(t))
    if len(datas) != 1:
        raise ValueError("não achei uma data (ex.: 10/12/2025)" if not datas else "há mais de uma data")
    m = datas[0]
    d, mo, a = int(m.group(1)), int(m.group(2)), m.group(3)
    a = hoje.year if a is None else (2000 + int(a) if len(a) == 2 else int(a))
    try:
        data = dt.date(a, mo, d)
    except ValueError:
        raise ValueError(f"data inválida: {m.group(0)}")
    t = t[:m.start()] + " " + t[m.end():]
    regs = list(RE_REG.finditer(t))
    if len(regs) != 1:
        raise ValueError("não achei a leitura da régua (ex.: 25 m)" if not regs else "há mais de um número de régua")
    reg = float(regs[0].group(1).replace(",", "."))
    t = t[:regs[0].start()] + " " + t[regs[0].end():]
    nome = norm(re.sub(r"[,;:]", " ", t))
    nome = re.sub(r"\s+", " ", nome).strip()
    if not nome:
        raise ValueError("não achei a estação")
    cand = [e for e in estacoes if norm(e["estacao"]) == nome] or [e for e in estacoes if norm(e["estacao"]).startswith(nome)] or [e for e in estacoes if nome in norm(e["estacao"])]
    if len(cand) != 1:
        raise ValueError(f"estação '{nome}' " + ("não encontrada" if not cand else "ambígua: " + ", ".join(e["estacao"] for e in cand)) + ". Válidas: " + ", ".join(e["estacao"] for e in estacoes))
    if data > hoje + dt.timedelta(days=1):
        raise ValueError(f"data no futuro: {data.strftime('%d/%m/%Y')}")
    return cand[0]["estacao"], reg, data.isoformat(), hora


def main():
    simular = "--simular" in sys.argv
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    estacoes = json.load(open(BASE / "estacoes.json", encoding="utf-8"))
    da_fila = not args
    linhas = args if args else ([l.rstrip("\n") for l in FILA.read_text(encoding="utf-8").splitlines()] if FILA.exists() else [])
    pend = [l for l in linhas if l.strip() and not l.strip().startswith("#")]
    if not pend:
        print("Nenhum lançamento pendente.")
        return 0
    mestre_p = BASE / "leituras.json"
    mestre = json.load(open(mestre_p, encoding="utf-8"))
    ok, erros, log = [], [], []
    agora = dt.datetime.now().strftime("%Y-%m-%d %H:%M")
    for l in pend:
        try:
            est, reg, data, hora = entender(l, estacoes)
        except ValueError as e:
            erros.append(l); print(f"ERRO   {l!r}: {e}"); continue
        m = mestre.setdefault(est, {})
        ant = m.get(data)
        ult = max(m) if m else None
        aviso = ""
        if ant and abs(ant[0] - reg) > 1e-9:
            aviso = f" (substitui {ant[0]:.2f})"
        elif ant:
            aviso = " (já existia, igual)"
        prox = [m[k][0] for k in sorted(m) if abs(dt.date.fromisoformat(k).toordinal() - dt.date.fromisoformat(data).toordinal()) <= 3 and k != data]
        if prox and abs(reg - sorted(prox)[len(prox) // 2]) > 0.8:
            aviso += f" ATENÇÃO: difere {reg - sorted(prox)[len(prox) // 2]:+.2f} m dos dias vizinhos; o controle de qualidade pode descartar"
        print(f"{'SIMULA' if simular else 'OK    '} {est}, {reg:.2f} m, {dt.date.fromisoformat(data).strftime('%d/%m/%Y')}{aviso}")
        if not simular:
            m[data] = [round(reg, 3), f"{data}T{hora or '12:00'}"]
            log.append(f"{agora}\t{est}\t{reg:.3f}\t{data}\t{l}")
        ok.append(l)
    if simular or not ok:
        return 1 if erros and not ok else 0
    json.dump(mestre, open(mestre_p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    with open(BASE / "lancamentos_log.txt", "a", encoding="utf-8") as f:
        f.write("\n".join(log) + "\n")
    if da_fila:
        FILA.write_text(CAB + "".join(l + "\n" for l in erros), encoding="utf-8")
    r = subprocess.run([sys.executable, str(RAIZ / "tools" / "atualizar.py"), "--regenerar"], cwd=RAIZ, capture_output=True, text=True)
    print(r.stdout.strip().splitlines()[-1] if r.stdout.strip() else r.stderr)
    if erros:
        print(f"{len(erros)} linha(s) não entendida(s)" + (" ficaram em dados/lancamentos.txt." if da_fila else "."))
    return 0 if r.returncode == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
