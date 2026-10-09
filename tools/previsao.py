"""Previsão de nível por analogia climatológica com persistência da taxa.

F(h) = L0 + w·r·h + (1 − w)·C(h),  w = exp(−h/7)
  L0  último nível; r taxa (m/d) da regressão dos últimos 8 dias;
  C(h) mediana de L(t+h) − L(t) nos outros anos, origens t na mesma data ±10 dias.
Incerteza: retroprevisão deixando um ano de fora (origens a cada 3 dias em ±21 dias).
Mesma lógica do painel em JavaScript (calc "previsao"); teste de paridade em tools/teste_paridade.py.
"""
import math
import datetime as dt

H, K, J, STEP, GAP, TAU, NMIN = 100, 10, 21, 3, 7, 7, 6
NAN = float("nan")


def _med(v):
    b = sorted(v)
    n = len(b)
    return b[(n - 1) // 2] if n % 2 else (b[n // 2 - 1] + b[n // 2]) / 2


def _quant(b, p):
    x = (len(b) - 1) * p
    i = int(math.floor(x))
    return b[i] + (b[i + 1] - b[i]) * (x - i) if i + 1 < len(b) else b[i]


def _r3(v):
    return None if v is None or v != v or math.isinf(v) else round(v + 0.0, 3)


def prever_estacao(pontos):
    """pontos: {ordinal_do_dia: leitura}. Devolve dict com a previsão e as métricas."""
    ks = sorted(pontos)
    a, t0 = ks[0], ks[-1]
    L = [NAN] * (t0 - a + 1)
    for d in ks:
        L[d - a] = pontos[d]
    for i in range(1, len(ks)):
        g = ks[i] - ks[i - 1]
        if 1 < g <= GAP + 1:
            for u in range(1, g):
                L[ks[i - 1] + u - a] = pontos[ks[i - 1]] + (pontos[ks[i]] - pontos[ks[i - 1]]) * u / g

    def get(d):
        return L[d - a] if a <= d <= t0 else NAN

    def rate(o):
        m = sx = sy = sxy = sxx = 0
        for x in range(-7, 1):
            y = get(o + x)
            if y == y:
                m += 1; sx += x; sy += y; sxy += x * y; sxx += x * x
        if m < 5:
            return NAN
        return (m * sxy - sx * sy) / (m * sxx - sx * sx)

    d0 = dt.date.fromordinal(t0)
    cur, M, D0 = d0.year, d0.month, d0.day

    def org(y, j):
        return dt.date(y, M, min(D0, 28) if M == 2 else D0).toordinal() + j

    anos = []
    for y in range(cur - 8, cur):
        ok = sum(1 for k in range(-K, K + 1, 5) if get(org(y, k)) == get(org(y, k)))
        if ok >= 3:
            anos.append(y)
    OFF = J + K
    Dm, Rm = {}, {}
    for y in anos:
        Dm[y], Rm[y] = {}, {}
        for off in range(-OFF, OFF + 1):
            o = org(y, off)
            l0 = get(o)
            if l0 != l0:
                continue
            v = [NAN] * (H + 1)
            for h in range(1, H + 1):
                x = get(o + h)
                if x == x:
                    v[h] = x - l0
            Dm[y][off] = v
            Rm[y][off] = rate(o)

    def clim(j, excl):
        C = [NAN] * (H + 1)
        C[0] = 0.0
        usar = [y for y in anos if y != excl]
        for h in range(1, H + 1):
            v = []
            for y in usar:
                for k in range(-K, K + 1):
                    d = Dm[y].get(j + k)
                    if d is not None and d[h] == d[h]:
                        v.append(d[h])
            if len(v) >= NMIN:
                C[h] = _med(v)
        return C

    def prever(l0, r, C):
        out = []
        for h, c in enumerate(C):
            if c != c:
                out.append(NAN)
            else:
                w = math.exp(-h / TAU)
                out.append(l0 + w * r * h + (1 - w) * c)
        return out

    L0, r0 = get(t0), rate(t0)
    C0 = clim(0, None)
    F = prever(L0, r0, C0)
    E = [[] for _ in range(H + 1)]
    EC = [[] for _ in range(H + 1)]
    EP = [[] for _ in range(H + 1)]
    norig = 0
    for ys in range(cur - 8, cur + 1):
        for j in range(-J, J + 1, STEP):
            o = org(ys, j)
            l0 = get(o)
            if o >= t0 or l0 != l0:
                continue
            r = rate(o)
            if r != r:
                continue
            C = clim(j, ys)
            Fh = prever(l0, r, C)
            usou = False
            for h in range(1, H + 1):
                ob = get(o + h)
                if ob != ob or Fh[h] != Fh[h]:
                    continue
                E[h].append(Fh[h] - ob)
                EC[h].append(l0 + C[h] - ob)
                EP[h].append(l0 - ob)
                usou = True
            if usou:
                norig += 1

    def rmse(e):
        return math.sqrt(sum(x * x for x in e) / len(e)) if e else None

    nom, el, eh, ql, qh = [0], [0], [0], [0], [0]
    cn = cel = ceh = cql = cqh = 0.0
    for h in range(1, H + 1):
        p = [x for g in range(max(1, h - 3), min(H, h + 3) + 1) for x in E[g]]
        if len(p) < 30:
            for arr in (nom, el, eh, ql, qh):
                arr.append(None)
            continue
        s = sorted(p)
        sd = math.sqrt(sum(x * x for x in p) / len(p))
        cn = max(cn, 1.96 * sd)
        cel = max(cel, _quant(s, 0.975)); ceh = max(ceh, -_quant(s, 0.025))
        cql = max(cql, _quant(s, 0.75)); cqh = max(cqh, -_quant(s, 0.25))
        nom.append(_r3(cn)); el.append(_r3(max(0, cel))); eh.append(_r3(max(0, ceh)))
        ql.append(_r3(max(0, cql))); qh.append(_r3(max(0, cqh)))
    skill = [{"h": h, "metodo": _r3(rmse(E[h])), "climatologia": _r3(rmse(EC[h])), "persistencia": _r3(rmse(EP[h])), "n": len(E[h])}
             for h in (1, 3, 7, 15, 30, 60, 90)]
    return {"origem": dt.date.fromordinal(t0).isoformat(), "L0": _r3(L0), "taxa_cm_dia": _r3(r0 * 100), "anos_clim": len(anos),
            "n_origens": norig, "f": [_r3(x) for x in F], "nom": nom, "el": el, "eh": eh, "ql": ql, "qh": qh, "skill": skill}
