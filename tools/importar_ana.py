#!/usr/bin/env python3
"""Importa séries históricas de cotas (ANA/Hidroweb, arquivos *_Cotas.txt) e réguas longas (xlsx) para dados/base/historico.json.

Uso (raiz do repositório):
    python3 tools/importar_ana.py            # lê dados/ana/*_Cotas.txt e dados/fontes/Santarem_regua_longa.xlsx

Regras (normalização):
  - Hidroweb: um registro por mês (Cota01..Cota31, em cm) → um valor por dia, em metros.
  - Nível de consistência: se o mês existe consistido (2) e bruto (1), vale o consistido.
  - Status: valem 1 (real) e 2 (estimado). Branco (0), duvidoso (3), régua seca (4) e células vazias viram NaN (dia ausente).
  - xlsx de régua (Estação | Data | Nível): vale a última leitura de cada dia.
O histórico nunca sobrescreve leituras de dados/base/leituras.json (planilha e lançamentos): tools/atualizar.py as sobrepõe.
O relatório (dados/base/historico_relatorio.txt) mostra período, falhas e a concordância com as leituras já existentes.
"""
import json, re, sys, calendar, datetime as dt, statistics as st
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
ANA, FONTES, BASE = RAIZ / "dados" / "ana", RAIZ / "dados" / "fontes", RAIZ / "dados" / "base"
CODIGOS = {"14990000": "Manaus", "16030000": "Itacoatiara", "16350002": "Parintins", "17050000": "Óbidos", "16900000": "Oriximiná",
           "16600000": "Porto Trombetas", "10100000": "Tabatinga", "14900050": "Novo Airão"}
VALIDOS = {"1", "2"}
# Trechos do histórico que NÃO são comparáveis com as réguas atuais (outro zero de régua ou valores impossíveis) → NaN.
# estação: (início, fim, motivo). Revise ao receber dados novos ou fichas F-43 que expliquem a mudança.
EXCLUIR = {
    "Itacoatiara": ("0000-01-01", "2008-02-29", "outro zero de régua: salto de ~7 m em fev/2008 (1998–2008 em cotas ~7 m mais altas; antes de 1998 ~6 m mais baixas)"),
    "Oriximiná": ("0000-01-01", "1970-12-31", "valores impossíveis em 1968–1970 (de −97 a +86 m e bloco de ~+20 m em ago–dez/1969)"),
    "Porto Trombetas": ("0000-01-01", "1999-12-31", "1987–1988 em outro zero de régua (cotas ~4 m abaixo das atuais)"),
}


def ler_ana(caminho):
    linhas = caminho.read_text(encoding="latin-1").splitlines()
    i = next(k for k, l in enumerate(linhas) if l.startswith("EstacaoCodigo"))
    cab = linhas[i].split(";")
    ic = {n: k for k, n in enumerate(cab)}
    meses, cod = {}, None
    for l in linhas[i + 1:]:
        p = l.split(";")
        if len(p) < len(cab) - 2 or not p[0].strip():
            continue
        cod = p[0].strip()
        nivel, data = int(p[ic["NivelConsistencia"]]), p[ic["Data"]]
        d, m, a = map(int, data.split("/"))
        meses.setdefault((a, m), {})[nivel] = p
    out, cont = {}, {"dias": 0, "sem_valor": 0, "status_descartado": 0, "n1": 0, "n2": 0}
    for (a, m), niveis in sorted(meses.items()):
        for nivel in sorted(niveis, reverse=True):  # 2 antes de 1
            p = niveis[nivel]
            for dia in range(1, calendar.monthrange(a, m)[1] + 1):
                k = f"{a:04d}-{m:02d}-{dia:02d}"
                if k in out:
                    continue
                v = p[ic[f"Cota{dia:02d}"]].strip().replace(",", ".")
                s = p[ic[f"Cota{dia:02d}Status"]].strip() if f"Cota{dia:02d}Status" in ic and ic[f"Cota{dia:02d}Status"] < len(p) else ""
                if v == "":
                    cont["sem_valor"] += 1
                    continue
                if s not in VALIDOS:
                    cont["status_descartado"] += 1
                    continue
                out[k] = round(float(v) / 100, 3)
                cont["dias"] += 1; cont["n%d" % nivel] += 1
    return cod, out, cont


def ler_regua_xlsx(caminho):
    import openpyxl
    ws = openpyxl.load_workbook(caminho, data_only=True, read_only=True).worksheets[0]
    por_dia = {}
    for i, r in enumerate(ws.iter_rows(values_only=True)):
        if i == 0 or r[0] is None or not isinstance(r[1], dt.datetime) or r[2] is None:
            continue
        try:
            v = float(r[2])
        except (TypeError, ValueError):
            continue
        k = r[1].date().isoformat()
        if k not in por_dia or r[1] > por_dia[k][0]:
            por_dia[k] = (r[1], round(v, 3))
    return {k: v for k, (_, v) in por_dia.items()}


def main():
    hist, rel, meta = {}, [], {}
    for f in sorted(ANA.glob("*_Cotas.txt")):
        cod, serie, cont = ler_ana(f)
        nome = CODIGOS.get(cod)
        if not nome:
            rel.append(f"{f.name}: código {cod} sem estação correspondente (ignorado)")
            continue
        hist[nome] = serie
        meta[nome] = {"fonte": f"ANA Hidroweb {cod}", "dias": cont["dias"], "pct_consistido": round(100 * cont["n2"] / max(1, cont["dias"]), 1), "pct_bruto": round(100 * cont["n1"] / max(1, cont["dias"]), 1), "descartados_status": cont["status_descartado"] + cont["sem_valor"], "excluido": None}
        ks = sorted(serie)
        rel.append(f"{nome:<16} ANA {cod}: {ks[0]} a {ks[-1]}; {cont['dias']} dias válidos; {cont['sem_valor']} sem valor; {cont['status_descartado']} descartados por status (branco/duvidoso/régua seca)")
    nomes = {n.lower(): n for n in ["Manaus", "Itacoatiara", "Parintins", "Juruti", "Óbidos", "Santarém", "Oriximiná", "Porto Trombetas"]}
    for x in sorted(FONTES.glob("*_regua.xlsx")):
        import openpyxl, unicodedata
        norm = lambda t: "".join(c for c in unicodedata.normalize("NFD", t) if unicodedata.category(c) != "Mn").lower()
        rotulo = next(r[0] for i, r in enumerate(openpyxl.load_workbook(x, read_only=True, data_only=True).worksheets[0].iter_rows(values_only=True)) if i == 1)
        chave = norm(str(rotulo).split("-")[-1].strip())
        nome = next((n for n in nomes.values() if norm(n).startswith(chave) or chave.startswith(norm(n).split()[-1])), None)
        if not nome:
            rel.append(f"{x.name}: estação '{rotulo}' não cadastrada (ignorado)"); continue
        s_ = ler_regua_xlsx(x)
        n_sob = sum(1 for k in s_ if k in hist.get(nome, {}))
        hist.setdefault(nome, {}).update(s_)  # leituras de régua prevalecem sobre a ANA no mesmo dia
        ks = sorted(s_)
        m = meta.setdefault(nome, {"fonte": "", "dias": 0, "pct_consistido": None, "pct_bruto": None, "descartados_status": 0, "excluido": None})
        m["fonte"] = (m["fonte"] + " + " if m["fonte"] else "") + "régua (xlsx do Setor de Hidrografia)"
        rel.append(f"{nome:<16} xlsx régua: {ks[0]} a {ks[-1]}; {len(s_)} dias (última leitura do dia); {n_sob} sobrepõem a ANA")
    for nome, (a_, b_, motivo) in EXCLUIR.items():
        if nome in hist:
            n0 = len(hist[nome])
            hist[nome] = {k: v for k, v in hist[nome].items() if not (a_ <= k <= b_)}
            meta.setdefault(nome, {})["excluido"] = f"até {b_[8:]}/{b_[5:7]}/{b_[:4]}: {motivo}"
            rel.append(f"{nome:<16} excluídos {n0 - len(hist[nome])} dias até {b_}: {motivo}")
    # alerta: anos cuja média destoa >3,5 m da mediana dos anos vizinhos (possível mudança de zero da régua)
    import collections
    rel.append("")
    rel.append("Alertas de possível mudança de zero (média anual > 3,5 m distante dos 2 anos vizinhos de cada lado; confira nas fichas F-43):")
    achou = False
    for nome, s_ in hist.items():
        por = collections.defaultdict(list)
        for k, v in s_.items():
            por[int(k[:4])].append(v)
        mm = {y: st.mean(v) for y, v in por.items() if len(v) >= 250}
        for y, m in sorted(mm.items()):
            viz = [mm[z] for z in (y - 2, y - 1, y + 1, y + 2) if z in mm]
            if len(viz) >= 2 and abs(m - st.median(viz)) > 3.5:
                rel.append(f"  {nome}: {y} (média {m:.1f} m × vizinhos {st.median(viz):.1f} m)"); achou = True
    if not achou:
        rel.append("  nenhum")
    # concordância com as leituras existentes (planilha/lançamentos)
    lei = json.load(open(BASE / "leituras.json", encoding="utf-8")) if (BASE / "leituras.json").exists() else {}
    rel.append("")
    rel.append("Concordância histórico × leituras existentes (dias em comum):")
    for nome, s in hist.items():
        d = [(k, s[k] - lei[nome][k][0]) for k in s if nome in lei and k in lei[nome]]
        if not d:
            rel.append(f"  {nome:<16} sem dias em comum")
            continue
        dif = [x for _, x in d]
        rel.append(f"  {nome:<16} {len(d):>5} dias; diferença mediana {st.median(dif):+.3f} m; |dif| máx. {max(abs(x) for x in dif):.2f} m; {sum(1 for x in dif if abs(x) > 0.05)} dias com |dif| > 5 cm")
    json.dump(meta, open(BASE / "historico_meta.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    json.dump(hist, open(BASE / "historico.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    (BASE / "historico_relatorio.txt").write_text("\n".join(rel) + "\n", encoding="utf-8")
    print("\n".join(rel))
    print(f"\nhistorico.json gravado ({(BASE / 'historico.json').stat().st_size // 1024} KB).")


if __name__ == "__main__":
    sys.exit(main())
