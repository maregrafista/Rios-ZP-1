#!/usr/bin/env python3
"""Atualiza o app a partir da planilha de réguas.

Uso (na raiz do repositório):
    python3 tools/atualizar.py                # usa a planilha mais recente de dados/*.xlsx
    python3 tools/atualizar.py planilha.xlsx  # planilha indicada
    opções: --revisar  aceita valores diferentes em dias já fechados
            --forcar   regera mesmo que a planilha não tenha mudado

Fluxo: lê o cabeçalho (pares "Data" | "<Estação>"), reduz a um valor por dia (a última leitura),
cadastra só o que é novo em dados/base/leituras.json, refaz o controle de qualidade, recalcula
a previsão e grava data.json. Dia fechado com valor diferente não é sobrescrito: vai ao relatório.
Dependência: openpyxl.
"""
import sys, json, hashlib, statistics as st, unicodedata, datetime as dt
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BASE = RAIZ / "dados" / "base"
sys.path.insert(0, str(Path(__file__).resolve().parent))
from previsao import prever_estacao  # noqa: E402

LIMITE_QC_M, JANELA_QC, PASSADAS_QC = 0.8, 5, 3
RELATORIO = []


def log(*a):
    s = " ".join(str(x) for x in a)
    RELATORIO.append(s)
    print(s)


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s)) if unicodedata.category(c) != "Mn").strip().lower()


def slug(s):
    return norm(s).replace(" ", "-")


def _quando(p):
    """Instante do último commit que tocou o arquivo (senão, a data de modificação)."""
    import subprocess
    try:
        s = subprocess.run(["git", "log", "-1", "--format=%ct", "--", str(p)], cwd=RAIZ, capture_output=True, text=True).stdout.strip()
        return float(s) if s else p.stat().st_mtime
    except Exception:
        return p.stat().st_mtime


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def ler_planilha(caminho, estacoes):
    import openpyxl
    ws = openpyxl.load_workbook(caminho, data_only=True, read_only=True).worksheets[0]
    linhas = ws.iter_rows(values_only=True)
    cab = next(linhas)
    nomes = {norm(e["estacao"]): e["estacao"] for e in estacoes}
    cols, ignoradas = {}, []
    for c in range(len(cab) - 1):
        if cab[c] is not None and norm(cab[c]) == "data" and cab[c + 1] is not None:
            (cols.__setitem__(nomes[norm(cab[c + 1])], (c, c + 1)) if norm(cab[c + 1]) in nomes else ignoradas.append(str(cab[c + 1])))
    dia = {e: {} for e in cols}
    lidas = 0
    for r in linhas:
        for e, (cd, cv) in cols.items():
            if cv >= len(r) or r[cd] is None or r[cv] is None or not isinstance(r[cd], dt.datetime):
                continue
            try:
                v = float(r[cv])
            except (TypeError, ValueError):
                continue
            lidas += 1
            k = r[cd].date().isoformat()
            if k not in dia[e] or r[cd].isoformat() > dia[e][k][1]:
                dia[e][k] = (round(v, 3), r[cd].isoformat(timespec="minutes"))
    return dia, lidas, ignoradas


def qc(serie):
    datas, desc = sorted(serie), []
    for _ in range(PASSADAS_QC):
        ruins = []
        for i, k in enumerate(datas):
            viz = [serie[datas[j]] for j in range(max(0, i - JANELA_QC), min(len(datas), i + JANELA_QC + 1)) if j != i]
            if viz and abs(serie[k] - st.median(viz)) > LIMITE_QC_M:
                ruins.append((k, st.median(viz)))
        if not ruins:
            break
        for k, med in ruins:
            desc.append({"data": k, "regua": serie[k], "mediana_local": round(med, 2), "desvio_m": round(serie[k] - med, 2)})
        rm = {k for k, _ in ruins}
        datas = [k for k in datas if k not in rm]
    return {k: serie[k] for k in datas}, desc


def mesclar(mestre, dia, estacoes, revisar):
    for e in estacoes:
        n = e["estacao"]
        if n not in dia:
            log(f"{n:<16} sem coluna na planilha")
            continue
        m = mestre.setdefault(n, {})
        ultimo = max(m) if m else ""
        novos = atual = iguais = 0
        conflitos = []
        for k, (v, ts) in sorted(dia[n].items()):
            if k not in m:
                m[k] = [v, ts]; novos += 1
            elif abs(m[k][0] - v) < 1e-9:
                iguais += 1
            elif k == ultimo or revisar:
                m[k] = [v, ts]; atual += 1
            else:
                conflitos.append((k, m[k][0], v))
        log(f"{n:<16} novos {novos:>5}  atualizados {atual:>3}  iguais {iguais:>5}  conflitos {len(conflitos):>3}  último dia {max(m)}")
        for k, a, b in conflitos[:10]:
            log(f"    conflito {k}: base {a} × planilha {b} (não alterado)")
    return mestre


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    revisar, forcar = "--revisar" in sys.argv, "--forcar" in sys.argv
    estacoes = json.load(open(BASE / "estacoes.json", encoding="utf-8"))
    mestre_p, data_p = BASE / "leituras.json", RAIZ / "data.json"
    mestre = json.load(open(mestre_p, encoding="utf-8")) if mestre_p.exists() else {}
    antigo = json.load(open(data_p, encoding="utf-8")) if data_p.exists() else {}
    xlsx = Path(args[0]) if args else None
    if xlsx is None:
        c = sorted((RAIZ / "dados").glob("*.xlsx"), key=_quando)
        xlsx = c[-1] if c else None
    h = sha(xlsx) if xlsx else None
    if xlsx and h == antigo.get("planilha", {}).get("sha256") and not forcar and not args:
        print("Planilha sem mudança desde a última atualização. Nada a fazer.")
        return 0
    if xlsx:
        dia, lidas, ign = ler_planilha(xlsx, estacoes)
        log(f"Planilha: {xlsx.name} ({lidas} leituras)")
        if ign:
            log("Colunas ignoradas (estação não cadastrada): " + ", ".join(ign))
        mestre = mesclar(mestre, dia, estacoes, revisar)
        json.dump(mestre, open(mestre_p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    elif not mestre:
        sys.exit("Coloque a planilha .xlsx em dados/ ou informe o caminho.")
    sipam = json.load(open(BASE / "sipam.json", encoding="utf-8"))
    prog = json.load(open(BASE / "sipam_prog.json", encoding="utf-8"))
    saida, descartes = [], []
    for e in estacoes:
        n = e["estacao"]
        bom, desc = qc({k: v[0] for k, v in mestre.get(n, {}).items()})
        descartes += [{"estacao": n, **d} for d in desc]
        ks = sorted(bom)
        ini = dt.date.fromisoformat(ks[0]).toordinal(); fim = dt.date.fromisoformat(ks[-1]).toordinal()
        vals = [None] * (fim - ini + 1)
        for k in ks:
            vals[dt.date.fromisoformat(k).toordinal() - ini] = round(bom[k], 2)
        prev = prever_estacao({dt.date.fromisoformat(k).toordinal(): bom[k] for k in ks})
        log(f"{n:<16} série {ks[0]} a {ks[-1]} ({len(ks)} dias; QC descartou {len(desc)}); +30 d: {prev['f'][30]}")
        saida.append({"id": slug(n), "nome": n, "rio": e["rio"], "uf": e["uf"], "ordem": e["ordem"], "ana": e["codigo_ana"], "carta": e["carta"], "rn": e["rn"],
                      "nr": e["nr_adotado_m"], "nr_f43": e["nr_f43_m"], "fonte_nr": e["fonte_nr"], "criterio": e["criterio"],
                      "nr_rn_cm": e["nr_abaixo_rn_cm"], "zero_rn_cm": e["zero_abaixo_rn_cm"], "ficha": e.get("ficha"),
                      "ini": dt.date.fromordinal(ini).isoformat(), "v": vals, "prev": prev})
    out = {"schema": 1, "gerado": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
           "hoje": max(s["prev"]["origem"] for s in saida),
           "planilha": {"nome": xlsx.name if xlsx else None, "sha256": h},
           "estacoes": saida, "qc": descartes,
           "sipam": {"boletim": sipam[0]["boletim"], "var15": sipam, "prog": prog}}
    json.dump(out, open(data_p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    # versão do cache do app (para os celulares baixarem a atualização)
    sw = RAIZ / "sw.js"
    if sw.exists():
        t = sw.read_text(encoding="utf-8")
        import re
        sw.write_text(re.sub(r"const VERSAO='[^']*'", f"const VERSAO='{out['hoje']}-{out['gerado'][11:19].replace(':','')}'", t), encoding="utf-8")
    (BASE / "relatorio.txt").write_text("\n".join(RELATORIO) + "\n", encoding="utf-8")
    print(f"\ndata.json gravado ({data_p.stat().st_size // 1024} KB), dados até {out['hoje']}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
