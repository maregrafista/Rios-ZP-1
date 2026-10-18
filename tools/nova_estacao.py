#!/usr/bin/env python3
"""Cadastra uma estação nova no app (ela aparece no seletor, no esquema, nas tabelas e no gráfico).

Uso:
    python3 tools/nova_estacao.py "Almerim" --rio "Rio Xingu" --uf PA --nr 2,10
    opções: --ana 18000000 (código ANA)  --carta 4030  --rn "RN1-DHN"  --fonte "texto"  --ordem 9

Depois lance as leituras (tools/lancar.py ou dados/lancamentos.txt). A previsão e as faixas de anomalia
precisam de histórico: com poucos dias a estação aparece, mas a previsão fica pouco confiável até acumular
pelo menos 1 ano de leituras diárias. O NR (nível de redução) é obrigatório — não existe valor padrão.
"""
import sys, json, argparse
from pathlib import Path

BASE = Path(__file__).resolve().parent.parent / "dados" / "base"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("nome"); ap.add_argument("--rio", required=True); ap.add_argument("--uf", default="PA")
    ap.add_argument("--nr", required=True, help="NR adotado, em metros na régua (ex.: 2,10)")
    ap.add_argument("--ana", default=""); ap.add_argument("--carta", default=""); ap.add_argument("--rn", default="")
    ap.add_argument("--fonte", default="informado pelo usuário"); ap.add_argument("--ordem", type=int)
    a = ap.parse_args()
    f = BASE / "estacoes.json"
    lista = json.load(open(f, encoding="utf-8"))
    if any(e["estacao"].lower() == a.nome.lower() for e in lista):
        sys.exit(f"{a.nome} já está cadastrada.")
    nr = float(a.nr.replace(",", "."))
    lista.append({"estacao": a.nome, "rio": a.rio, "uf": a.uf, "ordem": a.ordem or max(e["ordem"] for e in lista) + 1,
                  "codigo_ana": a.ana, "carta": a.carta, "rn": a.rn, "nr_abaixo_rn_cm": None, "zero_abaixo_rn_cm": None,
                  "nr_f43_m": nr, "nr_adotado_m": nr, "fonte_nr": a.fonte, "criterio": "informado pelo usuário"})
    json.dump(lista, open(f, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{a.nome} cadastrada (NR {nr:.2f} m). Lance as leituras e rode: bash tools/sincronizar.sh")


if __name__ == "__main__":
    main()
