#!/usr/bin/env python3
"""Consulta a API HidroWebservice da ANA (estações telemétricas) e compara com as leituras do app.

Credenciais (cadastro HidroWeb): variáveis de ambiente ANA_ID e ANA_SENHA, ou arquivo .ana.env na raiz
(linhas ANA_ID=... e ANA_SENHA=...; o arquivo é ignorado pelo git). Nunca grave a senha em outro lugar.

Uso (raiz do repositório):
    python3 tools/ana_api.py --teste                 # só autentica e mostra o formato da resposta de 1 estação
    python3 tools/ana_api.py --comparar [DIAS]       # compara a ANA com suas leituras (padrão: 7 dias); não grava nada
    python3 tools/ana_api.py --lancar [DIAS]         # grava em dados/lancamentos.txt a última leitura de cada dia (padrão: 3 dias)
    python3 tools/ana_api.py --lancar --simular      # só mostra o que gravaria
    python3 tools/ana_api.py --refazer ANOS          # refaz o histórico de leituras (janelas de 30 dias) com a média diária da ANA
Regra do --lancar: por estação e dia, vale a última medição da ANA; só entra se for mais nova que a leitura já existente no app.
"""
import os, sys, json, datetime as dt, urllib.request, urllib.error, urllib.parse
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
BASE_URL = "https://www.ana.gov.br/hidrowebservice/EstacoesTelemetricas"
CODIGOS = {"Manaus": "14990000", "Itacoatiara": "16030000", "Parintins": "16350002", "Óbidos": "17050001", "Santarém": "17900000",
           "Oriximiná": "16900000", "Almeirim": "18390000", "Tabatinga": "10100000", "Novo Airão": "14900050"}
# Métrica da ANA: o valor do dia é a média diária das medições (como a "Mediadiaria" das cotas convencionais, que forma o
# histórico do app). Vale só em dias com pelo menos 80 % das medições; o dia incompleto entra quando fechar.
# (A última medição do dia varia com a maré e com a hora, e não é comparável com o histórico.)
RANGE = {1: "HORA_24", 2: "DIAS_2", 7: "DIAS_7", 14: "DIAS_14", 21: "DIAS_21", 30: "DIAS_30"}


def credenciais():
    cred = {k: os.environ.get(k) for k in ("ANA_ID", "ANA_SENHA")}
    f = RAIZ / ".ana.env"
    if f.exists():
        for l in f.read_text().splitlines():
            if "=" in l and not l.strip().startswith("#"):
                k, v = l.split("=", 1)
                cred.setdefault(k.strip(), None)
                cred[k.strip()] = cred[k.strip()] or v.strip().strip('"\'')
    if not cred["ANA_ID"] or not cred["ANA_SENHA"]:
        sys.exit("Faltam ANA_ID e ANA_SENHA (variáveis de ambiente ou arquivo .ana.env).")
    return cred["ANA_ID"], cred["ANA_SENHA"]


def get(caminho, params=None, cab=None):
    url = f"{BASE_URL}/{caminho}" + ("?" + urllib.parse.urlencode(params) if params else "")
    req = urllib.request.Request(url, headers={"accept": "*/*", **(cab or {})})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            return json.load(r)
    except urllib.error.HTTPError as e:
        corpo = e.read().decode("utf-8", "ignore")[:300]
        sys.exit(f"A ANA respondeu HTTP {e.code} em {caminho}. {corpo}")


def token():
    i, s = credenciais()
    r = get("OAUth/v1", cab={"Identificador": i, "Senha": s})
    t = (r.get("items") or {}).get("tokenautenticacao") if isinstance(r, dict) else None
    if not t:
        sys.exit(f"Autenticação sem token. Resposta (sem dados sensíveis): chaves={list(r) if isinstance(r, dict) else type(r)} status={r.get('status') if isinstance(r, dict) else ''} message={r.get('message') if isinstance(r, dict) else ''}")
    return t


def serie(tk, codigos, dias):
    rng = RANGE[min((d for d in RANGE if d >= int(dias)), default=30)]
    p = {"Codigos_Estacoes": ",".join(codigos), "Tipo Filtro Data": "DATA_LEITURA", "Data de Busca (yyyy-MM-dd)": dt.date.today().isoformat(), "Range Intervalo de busca": rng}
    return get("HidroinfoanaSerieTelemetricaAdotada/v2", p, {"Authorization": f"Bearer {tk}"})


def lancar(itens, dias, simular):
    """Média diária da ANA por estação e dia completo; grava no lancamentos.txt os dias novos ou diferentes (> 0,5 cm)."""
    lei = json.loads((RAIZ / "dados" / "base" / "leituras.json").read_text(encoding="utf-8"))
    por_cod = {c: n for n, c in CODIGOS.items()}
    ultimo, dia_med = {}, {}  # (estação, dia) -> (instante, régua_m) | lista de (hora, régua_m)
    corte = dt.datetime.now() - dt.timedelta(days=dias)
    for it in itens:
        n, v = por_cod.get(it.get("codigoestacao")), it.get("Cota_Adotada")
        if not n or v in (None, ""):
            continue
        t = dt.datetime.fromisoformat(it["Data_Hora_Medicao"][:19])
        if t >= corte:
            dia_med.setdefault((n, t.date()), []).append((t.hour, float(v) / 100))
    tipico = {}  # medições por dia, típico de cada estação (Tabatinga transmite só 2 por dia; as demais, 96)
    for (n, dia), vs in dia_med.items():
        tipico.setdefault((n, dia.year, dia.month), []).append(len(vs))
    tipico = {k: sorted(v)[len(v) // 2] for k, v in tipico.items()}
    for (n, dia), vs in dia_med.items():
        tp = tipico[(n, dia.year, dia.month)]
        completo = len({h for h, _ in vs}) >= 20 if tp >= 12 else len(vs) >= min(2, tp)
        if completo:  # dia completo: medições em pelo menos 20 das 24 horas (estação esparsa: as 2 medições do dia)
            ultimo[(n, dia)] = (dt.datetime.combine(dia, dt.time(12, 0)), sum(v for _, v in vs) / len(vs))
    linhas = []
    for (n, dia), (t, v) in sorted(ultimo.items(), key=lambda x: (x[0][0], x[0][1])):
        ant = lei.get(n, {}).get(dia.isoformat())
        if ant and abs(ant[0] - v) < 0.005:
            continue
        nota = f"  (substitui {ant[0]:.2f})" if ant and abs(ant[0] - v) > 1e-9 else ""
        linhas.append(f"{n}\t{t:%d/%m/%Y %H:%M}\t{v:.2f}".replace(".", ","))
        print(f"{'SIMULA' if simular else 'LANÇA '} {n:14}{t:%d/%m/%Y %H:%M} {v:6.2f} m{nota}")
    if not linhas:
        print("Nada novo da ANA.")
    elif not simular:
        with open(RAIZ / "dados" / "lancamentos.txt", "a", encoding="utf-8") as f:
            f.write("\n".join(linhas) + "\n")


def main():
    a = [x for x in sys.argv[1:] if x != "--simular"]
    simular = "--simular" in sys.argv
    modo = a[0] if a else "--teste"
    dias = float(a[1]) if len(a) > 1 else (3 if modo == "--lancar" else 7)
    tk = token()
    print("Autenticação OK.")
    if modo == "--refazer":
        itens, fim = [], dt.date.today()
        for k in range(0, int(dias * 365), 30):  # 'dias' = anos
            d = fim - dt.timedelta(days=k)
            for cod in CODIGOS.values():  # uma estação por chamada: respostas menores e sem estouro de tempo
                p = {"Codigos_Estacoes": cod, "Tipo Filtro Data": "DATA_LEITURA", "Data de Busca (yyyy-MM-dd)": d.isoformat(), "Range Intervalo de busca": "DIAS_30"}
                itens += (get("HidroinfoanaSerieTelemetricaAdotada/v2", p, {"Authorization": f"Bearer {tk}"}).get("items") or [])
            print(f"  janela até {d}: {len(itens)} medições acumuladas", flush=True)
        return lancar(itens, int(dias * 365) + 31, simular)
    r = serie(tk, [CODIGOS["Manaus"]] if modo == "--teste" else list(CODIGOS.values())[:10], dias)
    itens = r.get("items") if isinstance(r, dict) else r
    print(f"Resposta: status={r.get('status') if isinstance(r, dict) else ''} itens={len(itens or [])}")
    if modo == "--teste":
        print(json.dumps((itens or [])[:2], ensure_ascii=False, indent=1)[:1500])
        return
    if modo == "--lancar":
        return lancar(itens or [], dias, simular)
    lei = json.loads((RAIZ / "dados" / "base" / "leituras.json").read_text(encoding="utf-8"))
    por_cod = {c: n for n, c in CODIGOS.items()}
    ana = {}  # estação -> [(datetime, régua_m)]
    for it in itens or []:
        n, v = por_cod.get(it.get("codigoestacao")), it.get("Cota_Adotada")
        if n and v not in (None, ""):
            ana.setdefault(n, []).append((dt.datetime.fromisoformat(it["Data_Hora_Medicao"][:19]), float(v) / 100))
    print(f"{'Estação':14}{'Dia':11}{'Sua leitura':>12}{'ANA (próx.)':>12}{'Dif.':>7}  Hora ANA")
    difs = {}
    for n in CODIGOS:
        for dia, (val, quando) in sorted(lei.get(n, {}).items())[-int(dias):]:
            hora = dt.datetime.fromisoformat(quando if len(quando) > 10 else dia + "T12:00")
            if n in ana:
                t, v = min(ana[n], key=lambda x: abs(x[0] - hora))
                if abs((t - hora).total_seconds()) <= 3 * 3600:
                    difs.setdefault(n, []).append(v - val)
                    print(f"{n:14}{dia:11}{val:12.2f}{v:12.2f}{v - val:+7.2f}  {t:%d/%m %H:%M}")
        if n not in ana:
            print(f"{n:14}sem dados da ANA no período")
    print("\nResumo (ANA − sua leitura, m):")
    for n, d in difs.items():
        print(f"  {n:14} média {sum(d) / len(d):+.2f}  máx. |dif| {max(abs(x) for x in d):.2f}  ({len(d)} comparações)")


if __name__ == "__main__":
    main()
