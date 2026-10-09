(() => {
'use strict';
const DAY = 864e5, MES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const LS = { get(k, d) { try { const v = localStorage.getItem('zp1-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('zp1-' + k, JSON.stringify(v)); } catch (e) {} } };
const NFc = {}, nf = (d) => NFc[d] || (NFc[d] = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const num = (v, d = 2) => (v == null || !isFinite(v) ? '—' : nf(d).format(v).replace('-', '−'));
const sg = (v, d = 2) => { if (v == null || !isFinite(v)) return '—'; const r = Math.round(Math.abs(v) * 10 ** d); return (r === 0 ? '' : v < 0 ? '−' : '+') + nf(d).format(r / 10 ** d); };
const dnum = (s) => Date.parse(s + 'T00:00:00Z') / DAY, ISO = (d) => new Date(d * DAY).toISOString().slice(0, 10);
const dm = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '—'), dmy = (s) => (s ? dm(s) + '/' + s.slice(0, 4) : '—');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const NS = 'http://www.w3.org/2000/svg';
const sv = (t, a = {}, k = []) => { const n = document.createElementNS(NS, t); for (const [x, v] of Object.entries(a)) if (v != null) n.setAttribute(x, v); for (const c of [].concat(k)) if (c != null) n.append(c); return n; };
const lin = (d0, d1, r0, r1) => { const f = (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0); f.inv = (v) => d0 + ((v - r0) / (r1 - r0)) * (d1 - d0); return f; };
const ticks = (lo, hi, n) => { const raw = (hi - lo) / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p, s = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p, a = Math.ceil(lo / s) * s, o = []; for (let v = a; v <= hi + 1e-9; v += s) o.push(Math.round(v / s) * s); return { t: o, s }; };
const pth = (pts, fx, fy, def = (p) => p.v != null) => { let d = '', pen = false; for (const p of pts) { if (!def(p)) { pen = false; continue; } d += (pen ? 'L' : 'M') + fx(p.f).toFixed(1) + ' ' + fy(p.v).toFixed(1); pen = true; } return d; };
const band = (pts, a, b, fx, fy) => { const q = pts.filter((p) => p[a] != null && p[b] != null); if (q.length < 2) return ''; return 'M' + q.map((p) => fx(p.f).toFixed(1) + ' ' + fy(p[b]).toFixed(1)).join('L') + 'L' + [...q].reverse().map((p) => fx(p.f).toFixed(1) + ' ' + fy(p[a]).toFixed(1)).join('L') + 'Z'; };
const fileOf = (n) => norm(n).replace(/ /g, '_') + '_nr.pdf';

const PAL = { soft: ['#332288', '#88CCEE', '#117733', '#DDCC77', '#AA4499', '#888888', '#44AA99', '#CC6677'], dk: ['#9C93E8', '#88CCEE', '#4DB88A', '#DDCC77', '#D68AC4', '#AEAEAE', '#44AA99', '#CC6677'], hc: ['#33BBEE', '#009988', '#EE7733', '#CC3311', '#EE3377', '#0077BB', '#BBBBBB', '#555555'] };
const CORES = { bad: 'var(--bad)', warn: 'var(--warn)', ok: 'var(--ok)' };
const st = { est: LS.get('est', 'manaus'), ref: LS.get('ref', 'nr'), jan: ['7', '15', '30', '60', '90', '180', '365'].includes(LS.get('jan', '365')) ? LS.get('jan', '365') : '30', hc: LS.get('hc', false), tab: LS.get('tab', 'prev'), anos: null, cam: Object.assign({ prev: true, tend: true, nom: true, emp: true, med: false, ref: true, sip: true }, LS.get('cam', {})) };
let D = null, X = null;

// ---------- dados ----------
async function carregar(auto) {
  let novo = null; const E0 = window.__ZP1__;
  if (E0) { try { const r = await fetch(E0.url, { cache: 'no-cache' }); if (r.ok) { const j = await r.json(); if (j.gerado >= E0.dados.gerado) novo = j; } } catch (e) {} novo = novo || E0.dados; }
  else { const r = await fetch('data.json', { cache: 'no-cache' }); if (!r.ok) throw new Error('data.json ' + r.status); novo = await r.json(); }
  const mudou = D && novo.gerado !== D.gerado;
  D = novo; derivar();
  LS.set('cache-gerado', D.gerado);
  if (mudou && auto) toast('Dados atualizados: leituras até ' + dmy(D.hoje) + '.', 'Ver', () => show('prev'));
  return mudou;
}
function derivar() {
  X = { E: new Map(), hojeN: dnum(D.hoje) };
  for (const e of D.estacoes) {
    const ini = dnum(e.ini), m = new Map();
    e.v.forEach((v, i) => { if (v != null) m.set(ini + i, v); });
    e.m = m; X.E.set(e.id, e);
  }
  X.HOJE = X.hojeN; X.cur = new Date(X.HOJE * DAY).getUTCFullYear();
  const y0 = Math.min(...D.estacoes.map((e) => +e.ini.slice(0, 4)));
  X.anos = []; for (let y = y0; y <= X.cur; y++) X.anos.push(y);
  if (!st.anos) st.anos = new Set(X.anos);
  if (!X.E.has(st.est)) st.est = D.estacoes[0].id;
  for (const e of D.estacoes) e.r = resumir(e);
  X.list = [...D.estacoes].sort((a, b) => a.ordem - b.ordem);
}
function resumir(e) {
  const p = e.prev, t0 = dnum(p.origem), nr = e.nr, m = e.m, atraso = X.hojeN - t0;
  const ant = (d) => { for (let k = 0; k <= 3; k++) { const v = m.get(t0 - d - k); if (v !== undefined) return v; } return null; };
  const dif = (d) => { const v = ant(d); return v == null ? null : Math.round((p.L0 - v) * 100); };
  const d0 = new Date(t0 * DAY), cur = d0.getUTCFullYear(), vals = [];
  for (let y = cur - 8; y < cur; y++) { const s = []; for (let k = -3; k <= 3; k++) { const v = m.get(Date.UTC(y, d0.getUTCMonth(), Math.min(d0.getUTCDate(), d0.getUTCMonth() === 1 ? 28 : 31)) / DAY + k); if (v !== undefined) s.push(v); } if (s.length >= 4) vals.push(mean(s)); }
  const mu = vals.length ? mean(vals) : null, sd = vals.length > 2 ? Math.sqrt(vals.reduce((a, b) => a + (b - mu) ** 2, 0) / (vals.length - 1)) : null, z = sd ? (p.L0 - mu) / sd : null;
  const a = Math.abs(z || 0), cond = z == null ? 'Sem base' : a < 1 ? 'Normalidade' : 'Anomalia ' + (z < 0 ? 'negativa' : 'positiva') + (a < 1.5 ? ' leve' : a < 2 ? ' moderada' : a < 3 ? ' severa' : ' extrema');
  const at = (h) => { const i = h + atraso; return i <= 100 && p.f[i] != null ? p.f[i] : null; };
  const lim = (h) => { const i = h + atraso; return i <= 100 && p.eh[i] != null ? [p.f[i] - p.el[i], p.f[i] + p.eh[i]] : [null, null]; };
  let mn = null, mi = null, last = 0; for (let i = 0; i <= 100; i++) if (p.f[i] != null) { last = i; if (mn == null || p.f[i] < mn) { mn = p.f[i]; mi = i; } }
  let cruza = null; for (let i = 1; i <= 100; i++) if (p.f[i] != null && p.f[i] - nr <= 0) { cruza = i; break; }
  const dias = cruza == null ? null : Math.max(0, cruza - atraso), n0 = p.L0 - nr;
  let s = { t: 'Normal', c: 'ok' };
  if (n0 < 0) s = { t: 'Abaixo do NR', c: 'bad' }; else if (dias != null && dias <= 7) s = { t: 'NR em ' + dias + ' d', c: 'bad' }; else if (dias != null && dias <= 15) s = { t: 'NR em ' + dias + ' d', c: 'warn' }; else if (n0 < 1) s = { t: '< 1 m do NR', c: 'warn' };
  const o = { data: p.origem, t0, atraso, nr, taxa: Math.round(p.taxa_cm_dia * 10) / 10, d1: dif(1), d7: dif(7), d15: dif(15), mu, sd, z: z == null ? null : Math.round(z * 100) / 100, cond, s, L0: p.L0,
    f7: at(7), f15: at(15), f30: at(30), lim7: lim(7), lim15: lim(15), lim30: lim(30), min: mn, minData: mi == null ? null : ISO(t0 + mi), minBorda: mi === last, cruza: cruza == null ? null : ISO(t0 + cruza) };
  o.dataF = [7, 15, 30].map((h) => ISO(X.HOJE + h)); return o;
}
const E = () => X.E.get(st.est), ref = () => st.ref === 'nr', off = (e) => (ref() ? e.nr : 0), uni = () => (ref() ? 'm acima do NR' : 'm na régua');
const vv = (e, v) => (v == null ? null : v - off(e));

// ---------- layout, tema, abas ----------
function layout() {
  const pref = LS.get('layout', 'auto'), small = matchMedia('(max-width:800px)').matches, mode = pref === 'auto' ? (small ? 'mobile' : 'desktop') : pref;
  root.dataset.layout = mode; $$('#seg-lay button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.l === mode)));
  const phone = matchMedia('(pointer:coarse)').matches && screen.width <= 800, vp = $('meta[name=viewport]');
  if (root.dataset.prevLayout !== mode) { $$('details.ctrl').forEach((d) => { d.open = mode === 'desktop'; }); root.dataset.prevLayout = mode; }
  const nvp = document.createElement('meta'); nvp.name = 'viewport'; nvp.content = mode === 'desktop' && phone ? 'width=1024,initial-scale=1,viewport-fit=cover' : 'width=device-width,initial-scale=1,viewport-fit=cover'; vp.replaceWith(nvp);
  ajustaZoom();
  if (X) { setTimeout(redraw, 60); setTimeout(redraw, 400); }
}
function ajustaZoom() { const phone = matchMedia('(pointer:coarse)').matches && screen.width <= 800, w = innerWidth; root.style.zoom = root.dataset.layout === 'mobile' && phone && w > 500 ? String(Math.min(3, w / 460)) : ''; }
addEventListener('resize', () => { ajustaZoom(); });
$$('#seg-lay button').forEach((b) => b.addEventListener('click', () => { LS.set('layout', b.dataset.l); layout(); redraw(); }));
matchMedia('(max-width:800px)').addEventListener('change', () => { if (LS.get('layout', 'auto') === 'auto') { layout(); redraw(); } });
const dark = () => (root.dataset.theme === 'dark' || (root.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme:dark)').matches));
function tema() { const d = dark(); $('#b-tema').innerHTML = d ? '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'; $('meta[name=theme-color]').content = d ? '#141c26' : '#ffffff'; }
$('#b-tema').addEventListener('click', () => { const n = dark() ? 'light' : 'dark'; root.dataset.theme = n; LS.set('tema', n); tema(); redraw(); });
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => { tema(); redraw(); });
function show(v) { st.tab = v; LS.set('tab', v); $$('#tabs button,#bnav button').forEach((b) => { if (b.dataset.v === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); $$('.view').forEach((s) => { s.hidden = s.id !== 'v-' + v; }); scrollTo(0, 0); redraw(); }
$$('#tabs button,#bnav button').forEach((b) => b.addEventListener('click', () => show(b.dataset.v)));
$$('#seg-ref button').forEach((b) => b.addEventListener('click', () => { st.ref = b.dataset.r; LS.set('ref', st.ref); redraw(); }));
$$('#seg-jan button').forEach((b) => b.addEventListener('click', () => { st.jan = b.dataset.j; LS.set('jan', st.jan); redraw(); }));
$('#b-resumo').addEventListener('click', () => abrirStory());
$('#b-busca').addEventListener('click', () => abrirBusca());

// ---------- avisos ----------
let toastT;
function toast(t, label, fn) { const b = $('#toast'); $('#toast-t').textContent = t; const bt = $('#toast-b'); bt.textContent = label || 'OK'; bt.onclick = () => { b.hidden = true; fn && fn(); }; b.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { b.hidden = true; }, 9000); }
async function copiar(txt, msg) { try { await navigator.clipboard.writeText(txt); toast(msg || 'Copiado.'); } catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.append(ta); ta.select(); try { document.execCommand('copy'); toast(msg || 'Copiado.'); } catch (x) { toast('Não foi possível copiar.'); } ta.remove(); } }
function baixar(nome, txt, tipo) { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + txt.replace(/−/g, '-')], { type: tipo || 'text/csv;charset=utf-8' })); a.download = nome; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

// ---------- folha (bottom sheet) ----------
function abrirSheet(titulo, html) { $('#sh-t').textContent = titulo; $('#sh-b').innerHTML = html; $('#ovl').hidden = false; document.body.style.overflow = 'hidden'; $('#sh-x').focus(); return $('#sh-b'); }
function fecharSheet() { $('#ovl').hidden = true; document.body.style.overflow = ''; }
$('#sh-x').addEventListener('click', fecharSheet); $('#ovl').addEventListener('click', (e) => { if (e.target.id === 'ovl') fecharSheet(); });
(() => { let y0 = null; const sh = $('#sheet'); sh.addEventListener('touchstart', (e) => { y0 = sh.scrollTop === 0 ? e.touches[0].clientY : null; }, { passive: true }); sh.addEventListener('touchmove', (e) => { if (y0 != null && e.touches[0].clientY - y0 > 90) { y0 = null; fecharSheet(); } }, { passive: true }); })();
function sheetEstacao(id) {
  const e = X.E.get(id), r = e.r, o = off(e), c = (v) => num(vv(e, v));
  const html = `<p class="cap">${esc(e.rio)} · ${e.ana ? 'ANA ' + e.ana + ' · ' : ''}carta ${esc(e.carta)} · NR ${num(e.nr)} m na régua</p>
    <p><span class="pill ${r.s.c}">${esc(r.s.t)}</span> <span class="cap">${esc(r.cond)} (z ${num(r.z, 2)})</span></p>
    <div class="kg"><div><span>Nível (${dm(r.data)})</span><b>${c(r.L0)} m</b></div><div><span>Δ 24 h</span><b>${sg(r.d1, 0)} cm</b></div><div><span>Taxa 7 d</span><b>${sg(r.taxa, 1)} cm/d</b></div>
    <div><span>+7 d</span><b>${c(r.f7)}</b></div><div><span>+15 d</span><b>${c(r.f15)}</b></div><div><span>+30 d</span><b>${c(r.f30)}</b></div>
    <div><span>Mínimo previsto</span><b>${c(r.min)}</b></div><div><span>Em</span><b>${dm(r.minData)}</b></div><div><span>Cruza o NR</span><b>${r.cruza ? dm(r.cruza) : 'não'}</b></div></div>
    <div class="mini" id="sh-mini"></div>
    <div class="row"><button class="btn pri" id="sh-abrir" type="button">Abrir no gráfico</button><button class="btn" id="sh-comp" type="button">Compartilhar</button><button class="btn" id="sh-conv" type="button">Converter na carta</button></div>
`;
  const b = abrirSheet(e.nome, html); $('#sh-mini', b).append(miniFig(e, 380, 150));
  $('#sh-abrir', b).onclick = () => { fecharSheet(); st.est = id; LS.set('est', id); show('prev'); };
  $('#sh-comp', b).onclick = () => compartilhar(id);
  $('#sh-conv', b).onclick = () => { fecharSheet(); st.est = id; LS.set('est', id); rfReset(); show('ref'); };
}
function compartilhar(id) {
  const e = X.E.get(id || st.est), r = e.r, c = (v) => num(vv(e, v));
  const txt = `Rios ZP-1 · ${e.nome} (${e.rio}), ${dm(r.data)}: ${c(r.L0)} ${uni()}${ref() ? ' (régua ' + num(r.L0) + ' m)' : ''}; ${r.taxa < 0 ? 'vazante' : 'enchente'} ${num(Math.abs(r.taxa), 1)} cm/d. +7 d: ${c(r.f7)} m; +30 d: ${c(r.f30)} m. Mínimo previsto ${c(r.min)} m em ${dm(r.minData)}. ${location.href.split('#')[0]}`;
  if (navigator.share) navigator.share({ title: 'Rios ZP-1', text: txt }).catch(() => {}); else copiar(txt, 'Texto copiado.');
}

// ---------- gráfico ----------
const colAno = (y) => (y === X.cur ? 'var(--ink)' : (st.hc ? PAL.hc : dark() ? PAL.dk : PAL.soft)[(y - X.anos[0]) % 8]);
const CAM = [['prev', 'Previsão', 'd', 'var(--fc)'], ['tend', 'Tendência +7 d', 'd', 'var(--trend)'], ['nom', 'Faixa nominal 95%', 'd', 'var(--band2)'], ['emp', 'Incerteza empírica', 'f', 'var(--band)'], ['med', 'Mediana', 'd', 'var(--mut)'], ['ref', 'NR', '', 'var(--bad)'], ['sip', 'Prev. SipamHidro', '', 'var(--sip)']];
function controles() {
  const r = $('#row-cam'); $$('.tg', r).forEach((x) => x.remove());
  for (const [k, t0, cl, c] of CAM) { const t = k === 'med' ? 'Mediana ' + X.anos[0] + '-' + String(X.cur).slice(2) : t0; const b = document.createElement('button'); b.type = 'button'; b.className = 'tg'; b.style.setProperty('--c', c); b.setAttribute('aria-pressed', String(st.cam[k])); b.innerHTML = `<i class="${cl}"></i>${t}`; b.onclick = () => { st.cam[k] = !st.cam[k]; LS.set('cam', st.cam); redraw(); }; r.append(b); }
  const a = $('#row-anos'); $$('.tg,.lk', a).forEach((x) => x.remove());
  for (const y of X.anos) { const b = document.createElement('button'); b.type = 'button'; b.className = 'tg'; b.style.setProperty('--c', colAno(y)); b.setAttribute('aria-pressed', String(st.anos.has(y))); b.innerHTML = `<i></i>${y}`; b.onclick = (ev) => { if (ev.shiftKey || ev.altKey) st.anos = new Set([y]); else st.anos.has(y) ? st.anos.delete(y) : st.anos.add(y); redraw(); }; a.append(b); }
  const mk = (t, f) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'lk'; b.textContent = t; b.onclick = f; a.append(b); };
  mk('todos', () => { st.anos = new Set(X.anos); redraw(); }); mk('nenhum', () => { st.anos = new Set(); redraw(); }); mk('só ' + X.cur, () => { st.anos = new Set([X.cur]); redraw(); });
  $$('#seg-jan button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.j === st.jan)));
}
let csvG = '';
function grafico() {
  const box = $('#chart'), e = E(), P = e.prev, o = off(e), m = e.m, orig = dnum(P.origem), cur = X.cur, HOJE = X.HOJE, c = st.cam;
  let x0, x1; if (st.jan === '365') { x0 = Date.UTC(cur, 0, 1) / DAY; x1 = Date.UTC(cur, 11, 31) / DAY; } else { const h = st.jan === '180' ? 91 : +st.jan / 2; x0 = HOJE - h; x1 = HOJE + h; }
  const W = Math.max(300, box.clientWidth), Ht = Math.round(Math.min(520, Math.max(340, W * 0.55))), mg = { t: 14, r: W < 520 ? 42 : 54, b: 32, l: W < 520 ? 42 : 52 };
  const val = (y, f) => { const d = new Date(f * DAY), mo = d.getUTCMonth(), dd = d.getUTCDate(); if (mo === 1 && dd === 29) return null; const ty = d.getUTCFullYear() - (cur - y), v = m.get(Date.UTC(ty, mo, dd) / DAY); return v === undefined ? null : v - o; };
  const lines = [];
  for (const y of X.anos) { if (!st.anos.has(y)) continue; const pts = []; for (let f = Math.floor(x0); f <= x1; f++) { if (y === cur) { if (f > orig) continue; const v = m.get(f); pts.push({ f, v: v === undefined ? null : v - o }); } else pts.push({ f, v: val(y, f) }); } lines.push({ y, pts, c: colAno(y), w: y === cur ? (st.hc ? 3.2 : 2.8) : (st.hc ? 2.2 : 1.4) }); }
  const fc = []; for (let h = 0; h <= 100; h++) { const f = orig + h; if (f < x0 || f > x1 || P.f[h] == null) continue; const v = P.f[h] - o, g = (a, s) => (a[h] == null ? null : v + s * a[h]); fc.push({ f, h, v, nl: g(P.nom, -1), nh: g(P.nom, 1), el: g(P.el, -1), eh: g(P.eh, 1), ql: g(P.ql, -1), qh: g(P.qh, 1) }); }
  const r7 = P.taxa_cm_dia / 100, trend = [{ f: orig, v: P.L0 - o }, { f: orig + 7, v: P.L0 + r7 * 7 - o }];
  const med = []; if (c.med) for (let f = Math.floor(x0); f <= x1; f++) { const v = []; for (const y of X.anos) { const q = y < cur ? val(y, f) : (f <= orig ? (m.has(f) ? m.get(f) - o : null) : (P.f[f - orig] == null ? null : P.f[f - orig] - o)); if (q != null) v.push(q); } if (v.length >= 3) { v.sort((a, b) => a - b); med.push({ f, v: v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2 }); } }
  const sip = []; if (c.sip) for (const r of D.sipam.prog) if (r.estacao === e.nome) { const f = Date.UTC(+r.mes.slice(0, 4), +r.mes.slice(5, 7) - 1, 15) / DAY; if (f >= x0 && f <= x1) { if (r.modelo1_cm != null) sip.push({ f, v: r.modelo1_cm / 100 - o, k: 1 }); if (r.modelo2_cm != null) sip.push({ f, v: r.modelo2_cm / 100 - o, k: 2 }); } }
  const ys = []; for (const l of lines) for (const p of l.pts) if (p.v != null) ys.push(p.v);
  for (const p of fc) { if (c.prev || st.anos.has(cur)) ys.push(p.v); if (c.emp && p.el != null) ys.push(p.el, p.eh); if (c.nom && p.nl != null) ys.push(p.nl, p.nh); } for (const p of med) ys.push(p.v); for (const p of sip) ys.push(p.v); if (c.ref) ys.push(ref() ? 0 : e.nr);
  let lo = Math.min(...(ys.length ? ys : [0])), hi = Math.max(...(ys.length ? ys : [1])); if (hi - lo < 0.5) { hi += 0.25; lo -= 0.25; } const pd = (hi - lo) * 0.04; lo -= pd; hi += pd;
  const tk = ticks(lo, hi, 7); lo = Math.min(lo, tk.t[0]); hi = Math.max(hi, tk.t[tk.t.length - 1]);
  const xs = lin(x0, x1, mg.l, W - mg.r), yl = lin(lo, hi, Ht - mg.b, mg.t), xa = Ht - mg.b;
  const svg = sv('svg', { width: '100%', viewBox: `0 0 ${W} ${Ht}`, height: Ht, role: 'img', 'aria-label': 'Hidrograma de ' + e.nome });
  if (orig < x1) svg.append(sv('rect', { x: xs(Math.max(orig, x0)), y: mg.t, width: xs(x1) - xs(Math.max(orig, x0)), height: xa - mg.t, fill: 'var(--fc)', opacity: 0.045 })); if (orig < x1 && xs(x1) - xs(Math.max(orig, x0)) > 60) svg.append(sv('text', { x: xs(x1) - 4, y: xa - 6, 'text-anchor': 'end', style: 'fill:var(--fc);font-style:italic' }, 'previsão'));
  const fmtY = (v) => num(v, tk.s < 1 ? 1 : 0);
  for (const v of tk.t) { svg.append(sv('line', { x1: mg.l, x2: W - mg.r, y1: yl(v), y2: yl(v), stroke: 'var(--grid)', 'stroke-width': 0.8 })); svg.append(sv('line', { x1: mg.l - 4, x2: mg.l, y1: yl(v), y2: yl(v), stroke: 'var(--ink)', 'stroke-width': 0.9 })); svg.append(sv('text', { x: mg.l - 7, y: yl(v) + 3.5, 'text-anchor': 'end' }, fmtY(v))); }
  svg.append(sv('line', { x1: mg.l, x2: W - mg.r, y1: xa, y2: xa, stroke: 'var(--ink)', 'stroke-width': 0.9 })); svg.append(sv('line', { x1: mg.l, x2: mg.l, y1: mg.t, y2: xa, stroke: 'var(--ink)', 'stroke-width': 0.9 }));
  const lab = (f) => { const d = new Date(f * DAY); return String(d.getUTCDate()).padStart(2, '0') + ' ' + MES[d.getUTCMonth()]; };
  if (st.jan === '365' || st.jan === '180') {
    let d = new Date(x0 * DAY); d = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / DAY;
    while (d <= x1) { const dd = new Date(d * DAY), nx = Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth() + 1, 1) / DAY; if (d >= x0) { svg.append(sv('line', { x1: xs(d), x2: xs(d), y1: xa, y2: xa + 5, stroke: 'var(--line)' })); if (d > x0) svg.append(sv('line', { x1: xs(d), x2: xs(d), y1: mg.t, y2: xa, stroke: 'var(--grid)', 'stroke-dasharray': '1 3' })); } const a = Math.max(d, x0), b = Math.min(nx, x1); if (b - a >= 14) svg.append(sv('text', { x: xs((a + b) / 2), y: xa + 18, 'text-anchor': 'middle' }, (W < 460 ? MES[dd.getUTCMonth()][0] : MES[dd.getUTCMonth()]) + (dd.getUTCMonth() === 0 && st.jan === '180' ? ' ' + dd.getUTCFullYear() : ''))); d = nx; }
  } else {
    const sm = W < 520, step = { 7: 1, 15: sm ? 3 : 1, 30: sm ? 10 : 5, 60: sm ? 20 : 10, 90: sm ? 30 : 15 }[st.jan] || 15;
    for (let k = -Math.floor((HOJE - x0) / step); HOJE + k * step <= x1; k++) { const f = HOJE + k * step; if (f < x0) continue; svg.append(sv('line', { x1: xs(f), x2: xs(f), y1: mg.t, y2: xa, stroke: 'var(--grid)', 'stroke-dasharray': '1 3' })); svg.append(sv('line', { x1: xs(f), x2: xs(f), y1: xa, y2: xa + 4, stroke: 'var(--ink)', 'stroke-width': 0.9 })); svg.append(sv('text', { x: xs(f), y: xa + 17, 'text-anchor': 'middle' }, lab(f))); }
  }
  svg.append(sv('text', { transform: `translate(11 ${(mg.t + xa) / 2}) rotate(-90)`, 'text-anchor': 'middle' }, ref() ? 'Nível acima do NR (m)' : 'Leitura da régua (m)'));
  if (c.ref) { const yr = ref() ? 0 : e.nr; svg.append(sv('line', { x1: mg.l, x2: W - mg.r, y1: yl(yr), y2: yl(yr), stroke: 'var(--bad)', 'stroke-width': 1.4 })); svg.append(sv('text', { x: mg.l + 4, y: yl(yr) - 4, fill: 'var(--bad)', style: 'fill:var(--bad)' }, 'NR (datum da carta)' + (ref() ? '' : ' = ' + num(e.nr) + ' m'))); }
  if (c.emp && fc.length) { svg.append(sv('path', { d: band(fc, 'el', 'eh', xs, yl), fill: 'var(--band)', opacity: st.hc ? 0.26 : 0.16 })); svg.append(sv('path', { d: band(fc, 'ql', 'qh', xs, yl), fill: 'var(--band)', opacity: st.hc ? 0.42 : 0.30 })); }
  if (c.nom && fc.length) { for (const k of ['nl', 'nh']) { const q = fc.map((p) => ({ f: p.f, v: p[k] })); svg.append(sv('path', { d: pth(q, xs, yl), fill: 'none', stroke: 'var(--band2)', 'stroke-dasharray': '4 3', 'stroke-width': 1.1 })); } }
  if (med.length) svg.append(sv('path', { d: pth(med, xs, yl), fill: 'none', stroke: 'var(--mut)', 'stroke-dasharray': '1 4', 'stroke-linecap': 'round', 'stroke-width': 2.2 }));
  for (const l of [...lines].sort((a, b) => (a.y === cur) - (b.y === cur))) { const d = pth(l.pts, xs, yl); if (l.y === cur) svg.append(sv('path', { d, fill: 'none', stroke: 'var(--panel)', 'stroke-width': l.w + 3, opacity: 0.85, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })); svg.append(sv('path', { d, fill: 'none', stroke: l.c, 'stroke-width': l.w, opacity: l.y === cur ? 1 : 0.92, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })); }
  if (c.prev && fc.length > 1) { const d = pth(fc, xs, yl); svg.append(sv('path', { d, fill: 'none', stroke: 'var(--panel)', 'stroke-width': 6, opacity: 0.85 })); svg.append(sv('path', { d, fill: 'none', stroke: 'var(--fc)', 'stroke-width': st.hc ? 3.2 : 2.8, 'stroke-dasharray': '6 3.5' })); }
  if (c.tend) { svg.append(sv('path', { d: pth(trend, xs, yl), fill: 'none', stroke: 'var(--trend)', 'stroke-width': 2, 'stroke-dasharray': '2 3', 'stroke-linecap': 'round' })); if (orig + 7 <= x1) svg.append(sv('circle', { cx: xs(orig + 7), cy: yl(trend[1].v), r: 3.5, fill: 'var(--trend)' })); }
  for (const p of sip) svg.append(sv('path', { transform: `translate(${xs(p.f)} ${yl(p.v)})`, d: p.k === 1 ? 'M-4.5 0a4.5 4.5 0 1 0 9 0a4.5 4.5 0 1 0-9 0' : 'M0-5.5L5.5 4.5H-5.5Z', fill: 'var(--sip)', stroke: 'var(--panel)', 'stroke-width': 1.4 }));
  if (HOJE >= x0 && HOJE <= x1) { svg.append(sv('line', { x1: xs(HOJE), x2: xs(HOJE), y1: mg.t, y2: xa, stroke: 'var(--ink)', 'stroke-dasharray': '2 3', opacity: 0.7 })); svg.append(sv('text', { class: 'ink', x: xs(HOJE) + 4, y: mg.t + 10 }, 'últ. leitura ' + dm(ISO(HOJE)))); }
  if (orig >= x0 && orig <= x1 && m.has(orig)) svg.append(sv('circle', { cx: xs(orig), cy: yl(m.get(orig) - o), r: 4, fill: 'var(--ink)', stroke: 'var(--panel)', 'stroke-width': 1.5 }));
  const ends = lines.map((l) => { let q = null; for (const p of l.pts) if (p.v != null) q = p; return q && l.y !== cur ? { y: l.y, c: l.c, py: yl(q.v) } : null; }).filter(Boolean);
  if (st.anos.has(cur)) { const l = lines.find((z) => z.y === cur), q = fc.length && c.prev ? fc[fc.length - 1] : [...l.pts].reverse().find((p) => p.v != null); if (q) ends.push({ y: cur, c: 'var(--ink)', py: yl(q.v) }); }
  ends.sort((a, b) => a.py - b.py); for (let i = 1; i < ends.length; i++) if (ends[i].py - ends[i - 1].py < 12) ends[i].py = ends[i - 1].py + 12;
  for (const z of ends) { svg.append(sv('line', { x1: W - mg.r + 3, x2: W - mg.r + 12, y1: z.py, y2: z.py, stroke: z.c, 'stroke-width': 3 })); svg.append(sv('text', { class: 'ink', x: W - mg.r + 15, y: z.py + 3.5 }, String(z.y))); }
  const tip = document.createElement('div'); tip.className = 'tip';
  const cross = sv('line', { y1: mg.t, y2: xa, stroke: 'var(--mut)', opacity: 0 }), dots = sv('g'), fcm = new Map(fc.map((p) => [p.f, p]));
  svg.append(cross, dots);
  const ov = sv('rect', { x: mg.l, y: mg.t, width: W - mg.l - mg.r, height: xa - mg.t, fill: 'transparent', style: 'cursor:crosshair' });
  const mover = (ev) => {
    const rc = svg.getBoundingClientRect(), px = (ev.clientX - rc.left) * (W / rc.width), py = (ev.clientY - rc.top) * (W / rc.width), f = Math.round(xs.inv(px));
    if (f < x0 || f > x1) return; cross.setAttribute('x1', xs(f)); cross.setAttribute('x2', xs(f)); cross.setAttribute('opacity', 1);
    const rows = [], dd = []; for (const l of [...lines].reverse()) { const p = l.pts.find((q) => q.f === f); if (p && p.v != null) { rows.push({ c: l.c, t: l.y + (l.y === cur ? ' (obs.)' : ''), v: p.v }); dd.push({ c: l.c, v: p.v }); } }
    const q = fcm.get(f); if (q && f > orig && c.prev) { rows.unshift({ c: 'var(--fc)', t: cur + ' (prev.)', v: q.v }); dd.push({ c: 'var(--fc)', v: q.v }); }
    dots.replaceChildren(...dd.map((p) => sv('circle', { cx: xs(f), cy: yl(p.v), r: 3.5, fill: p.c, stroke: 'var(--panel)' })));
    tip.innerHTML = `<div class="h">${lab(f)}${f > HOJE ? ' · +' + (f - HOJE) + ' d' : ''}</div>` + rows.map((r) => `<div class="r"><span><i style="--c:${r.c}"></i>${r.t}</span><b>${num(r.v)}</b></div>`).join('') + (q && f > orig && c.emp && q.el != null ? `<div class="n">Empírica 95%: ${num(q.el)} a ${num(q.eh)}</div>` : '') + (q && f > orig && c.nom && q.nl != null ? `<div class="n">Nominal 95%: ${num(q.nl)} a ${num(q.nh)}</div>` : '');
    tip.style.opacity = 1; const tw = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(W - tw - 4, px + 14 + tw > W ? px - tw - 14 : px + 14)) + 'px'; tip.style.top = Math.max(4, Math.min(Ht - tip.offsetHeight - 4, py - 20)) + 'px';
  };
  ov.addEventListener('pointermove', mover); ov.addEventListener('pointerdown', mover); ov.addEventListener('pointerleave', () => { tip.style.opacity = 0; cross.setAttribute('opacity', 0); dots.replaceChildren(); });
  svg.append(ov); box.replaceChildren(svg, tip);
  const lg = []; if (st.anos.has(cur)) lg.push(['', 'var(--ink)', 'Observado ' + cur]); if (c.prev) lg.push(['d', 'var(--fc)', 'Previsão']); if (c.emp) lg.push(['f', 'var(--band)', 'Incerteza empírica 50 e 95%']); if (c.tend) lg.push(['t', 'var(--trend)', 'Tendência 7 d']); if (c.sip) lg.push(['s', 'var(--sip)', 'Prev. SipamHidro']);
  $('#leg').innerHTML = lg.map(([k, col, t]) => `<span><i class="${k}" style="--c:${col}"></i>${t}</span>`).join('');
  const head = ['data', ...lines.map((l) => l.y), 'previsao', 'emp_inf', 'emp_sup', 'nom_inf', 'nom_sup'], csv = [head.join(';')];
  for (let f = Math.floor(x0); f <= x1; f++) { const q = fcm.get(f); csv.push([ISO(f), ...lines.map((l) => { const p = l.pts.find((z) => z.f === f); return p && p.v != null ? num(p.v) : ''; }), q ? num(q.v) : '', q && q.el != null ? num(q.el) : '', q && q.eh != null ? num(q.eh) : '', q && q.nl != null ? num(q.nl) : '', q && q.nh != null ? num(q.nh) : ''].join(';')); }
  csvG = '# ' + e.nome + ' · ' + uni() + '\n' + csv.join('\n');
}
$('#b-csv-g').addEventListener('click', () => baixar('grafico_' + st.est + '.csv', csvG));
$('#b-share').addEventListener('click', () => compartilhar());
$('#hero').addEventListener('click', (ev) => { const b = ev.target.closest('[data-a]'); if (!b) return; ({ resumo: () => abrirStory(), comp: () => compartilhar(), conv: () => { rfReset(); show('ref'); }, ficha: () => sheetEstacao(st.est) })[b.dataset.a](); });

// ---------- previsão ----------
function miniFig(e, W = 380, Ht = 170) {
  const r = e.r, t0 = r.t0, o = off(e), pts = []; for (let f = t0 - 15; f <= t0; f++) if (e.m.has(f)) pts.push({ f, v: e.m.get(f) - o });
  const svg = sv('svg', { width: '100%', viewBox: `0 0 ${W} ${Ht}`, height: Ht }); if (pts.length < 3) return svg;
  const top = Ht > 160 ? 70 : 60, xs = lin(t0 - 15, t0, 38, W - 8); let lo = Math.min(...pts.map((p) => p.v)), hi = Math.max(...pts.map((p) => p.v)); const tk = ticks(lo, hi, 3); lo = Math.min(lo, tk.t[0]); hi = Math.max(hi, tk.t[tk.t.length - 1]); const y1 = lin(lo, hi, top, 8);
  for (const v of tk.t) { svg.append(sv('line', { x1: 38, x2: W - 8, y1: y1(v), y2: y1(v), stroke: 'var(--grid)' })); svg.append(sv('text', { x: 34, y: y1(v) + 3, 'text-anchor': 'end' }, num(v, tk.s < 1 ? 1 : 0))); }
  svg.append(sv('path', { d: pth(pts, xs, y1), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2 })); if (ref() && lo < 0 && hi > 0) svg.append(sv('line', { x1: 38, x2: W - 8, y1: y1(0), y2: y1(0), stroke: 'var(--bad)' }));
  const dl = []; for (let i = 1; i < pts.length; i++) if (pts[i].f - pts[i - 1].f === 1) dl.push({ f: pts[i].f, v: Math.round((pts[i].v - pts[i - 1].v) * 100) });
  const m2 = Math.max(1, ...dl.map((d) => Math.abs(d.v))), y2 = lin(-m2, m2, Ht - 20, top + 24), bw = Math.max(3, (W - 46) / 16 - 3);
  svg.append(sv('line', { x1: 38, x2: W - 8, y1: y2(0), y2: y2(0), stroke: 'var(--line)' }));
  for (const d of dl) svg.append(sv('rect', { x: xs(d.f) - bw / 2, width: bw, y: d.v < 0 ? y2(0) : y2(d.v), height: Math.abs(y2(d.v) - y2(0)), fill: d.v < 0 ? '#CC6677' : '#4F7CAC' }));
  svg.append(sv('text', { x: 38, y: top + 18 }, 'Δ diária (cm)')); svg.append(sv('text', { x: W - 8, y: 8, 'text-anchor': 'end' }, uni()));
  for (const f of [t0 - 15, t0 - 10, t0 - 5, t0]) svg.append(sv('text', { x: xs(f), y: Ht - 4, 'text-anchor': 'middle' }, dm(ISO(f)))); return svg;
}
function prever() {
  const e = E(), r = e.r, c = (v) => num(vv(e, v)), atr = r.atraso;
  $('#sub').textContent = 'Leituras até ' + dmy(D.hoje) + ' · ' + (ref() ? 'm acima do NR' : 'm na régua');
  $('#hero').innerHTML = `<div><div class="nome">${esc(e.nome)} · ${esc(e.rio)} · ${dm(r.data)}${atr ? ' (' + atr + ' d sem leitura)' : ''}</div>
    <div class="big">${ref() ? sg(vv(e, r.L0)) : num(r.L0)}<small> ${uni()}</small></div>
    <div><span class="pill ${r.s.c}">${esc(r.s.t)}</span> <span class="cap">${ref() ? 'régua ' + num(r.L0) + ' m' : 'NR em ' + num(e.nr) + ' m na régua'}</span></div></div>
    <div><div class="kv2"><div><span>Taxa 7 d</span><b>${sg(r.taxa, 1)} cm/d</b></div><div><span>Δ 24 h · 7 d</span><b>${sg(r.d1, 0)} · ${sg(r.d7, 0)} cm</b></div><div><span>+7 d (${dm(r.dataF[0])})</span><b>${c(r.f7)} m</b></div><div><span>+30 d (${dm(r.dataF[2])})</span><b>${c(r.f30)} m</b></div><div><span>Mínimo previsto</span><b>${c(r.min)} m</b></div><div><span>Em</span><b>${dm(r.minData)}</b></div></div>
    <div class="qa"><button class="btn" data-a="ficha" type="button">Detalhes</button><button class="btn" data-a="conv" type="button">Converter na carta</button><button class="btn" data-a="comp" type="button">Compartilhar</button></div></div>`;
  const ch = $('#chips'); ch.replaceChildren(...X.list.map((s) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', String(s.id === st.est)); b.style.setProperty('--c', CORES[s.r.s.c]); b.innerHTML = `<i></i>${esc(s.nome)}`; b.onclick = () => { st.est = s.id; LS.set('est', s.id); redraw(); }; return b; }));
  const sel = $('#chips [aria-selected=true]'); if (sel && sel.scrollIntoView) sel.scrollIntoView({ block: 'nearest', inline: 'center' });
  $('#cap1').innerHTML = `<b>Figura 1.</b> Nível diário de ${esc(e.nome)} (${ref() ? 'm acima do NR' : 'régua, m'}). Contínua: observado. Tracejada laranja: previsão (100 d). Pontilhada azul: tendência de 7 d. Sombreado: incerteza empírica (50 e 95%); tracejadas finas: faixa nominal 95%. Triângulo/círculo verdes: modelos 2/1 do SipamHidro. Shift-clique isola um ano.`;
  $('#q1-c').textContent = 'Horizonte a partir da última leitura (' + dmy(ISO(X.HOJE)) + ').';
  $('#q1 tbody').innerHTML = [0, 7, 15, 30, 60, 90].map((h) => { const i = h + atr; if (i > 100 || e.prev.f[i] == null) return ''; const v = vv(e, e.prev.f[i]), P = e.prev, rg = (a, b) => (a == null ? '—' : num(v - a) + '<span class="hm"> a </span><span class="hs">…</span>' + num(v + b)); return `<tr><td>${h ? '+' + h + ' d' : 'atual'}<small class="hs"> ${dm(ISO(X.HOJE + h))}</small></td><td class="hm">${dmy(ISO(X.HOJE + h))}</td><td class="n${ref() && v < 0 ? ' neg' : ''}">${num(v)}</td><td class="n">${rg(P.el[i], P.eh[i])}</td><td class="n">${rg(P.nom[i], P.nom[i])}</td></tr>`; }).join('');
  ['q1-n'].forEach((i) => { $('#' + i).textContent = 'Nível (' + uni() + ')'; });
  $('#q2-c').textContent = 'Toque na linha para o resumo. ● situação: vermelho = abaixo ou próximo do NR; âmbar = atenção; verde = normal.';
  const ord = { bad: 0, warn: 1, ok: 2 };
  $('#q2 tbody').innerHTML = [...X.list].sort((a, b) => ord[a.r.s.c] - ord[b.r.s.c] || (a.r.L0 - a.nr) - (b.r.L0 - b.nr)).map((s) => { const q = s.r, n = (v) => `<td class="n${ref() && vv(s, v) < 0 ? ' neg' : ''}">${num(vv(s, v))}</td>`; return `<tr data-id="${s.id}" class="${s.id === st.est ? 'sel' : ''}"><td><i class="dot ${q.s.c}" title="${esc(q.s.t)}"></i>${esc(s.nome)}</td><td class="hm"><span class="pill ${q.s.c}">${esc(q.s.t)}</span></td>${n(q.L0)}<td class="n hm">${sg(q.d1, 0)}</td><td class="n">${sg(q.d7, 0)}</td><td class="n hm">${sg(q.taxa, 1)}</td>${n(q.f7)}${n(q.f15)}${n(q.f30)}${n(q.min)}</tr>`; }).join('');
  $$('#q2 tbody tr').forEach((tr) => tr.addEventListener('click', () => sheetEstacao(tr.dataset.id)));
  cmpSip(); controles(); if (st.tab === 'prev') grafico();
}

// ---------- comparação com SipamHidro (muda com a janela) ----------
function cmpSip() {
  const e = E(), r = e.r, o = off(e), u = uni(), h = st.jan === '365' ? null : (st.jan === '180' ? 91 : +st.jan / 2), HOJE = X.HOJE;
  const fim = h == null ? Date.UTC(X.cur, 11, 31) / DAY : HOJE + h, rows = [], tx = [];
  const s15 = D.sipam.var15.find((s) => s.codigo_ana && s.codigo_ana === e.ana);
  const cmp = []; for (const z of X.list) { const s = D.sipam.var15.find((q) => q.codigo_ana && q.codigo_ana === z.ana); if (s && z.r.d15 != null) cmp.push([z.r.d15, s.var15_cm]); }
  let rr = null; if (cmp.length > 2) { const mx = mean(cmp.map((c) => c[0])), my = mean(cmp.map((c) => c[1])); rr = cmp.reduce((a, c) => a + (c[0] - mx) * (c[1] - my), 0) / Math.sqrt(cmp.reduce((a, c) => a + (c[0] - mx) ** 2, 0) * cmp.reduce((a, c) => a + (c[1] - my) ** 2, 0)); }
  if (s15 && r.d15 != null) {
    if (h != null && h <= 3.5) { const a = r.taxa, b = s15.var15_cm / 15; rows.push(['Taxa, cm/d (SipamHidro: 15 d)', sg(a, 1), sg(b, 1), sg(a - b, 1)]); tx.push(`Taxa de ${sg(a, 1)} cm/d no painel contra ${sg(b, 1)} cm/d no boletim (média de 15 d)`); }
    else { rows.push(['Variação em 15 d, cm', sg(r.d15, 0), sg(s15.var15_cm, 0), sg(r.d15 - s15.var15_cm, 0)]); tx.push(`Em 15 d o painel registra ${sg(r.d15, 0)} cm e o boletim ${sg(s15.var15_cm, 0)} cm (diferença ${sg(r.d15 - s15.var15_cm, 0)} cm)`); }
  } else tx.push('Esta estação não consta na tabela de variação em 15 d do boletim');
  const meses = [], dif = [];
  for (const p of D.sipam.prog) if (p.estacao === e.nome) {
    const [ano, mm] = p.mes.split('-').map(Number), ini = Date.UTC(ano, mm - 1, 1) / DAY, fm = Date.UTC(ano, mm, 0) / DAY;
    if (fm < HOJE || ini > fim) continue;
    const v = []; e.m.forEach((val, f) => { if (f >= ini && f <= fm) v.push(val); }); for (let k = 1; k <= 100; k++) { const f = r.t0 + k; if (f >= ini && f <= fm && e.prev.f[k] != null) v.push(e.prev.f[k]); }
    if (!v.length) continue; const mn = Math.min(...v) - o, m1 = p.modelo1_cm == null ? null : p.modelo1_cm / 100 - o, m2 = p.modelo2_cm == null ? null : p.modelo2_cm / 100 - o;
    rows.push([MES[mm - 1].charAt(0) + MES[mm - 1].slice(1).toLowerCase() + '/' + String(ano).slice(2) + ', mínima, m', num(mn), (m1 == null ? '—' : num(m1)) + ' | ' + (m2 == null ? '—' : num(m2)), m2 == null ? '—' : sg(mn - m2)]);
    meses.push(MES[mm - 1].toLowerCase()); if (m2 != null) dif.push([MES[mm - 1].toLowerCase(), mn - m2]);
  }
  if (meses.length) { const mx = dif.reduce((a, b) => (Math.abs(b[1]) > Math.abs(a[1]) ? b : a), dif[0]); tx.push(dif.length ? `${meses.length > 1 ? 'Nos meses da janela' : 'No mês da janela'} (${meses.join(', ')}), o painel fica ${num(Math.abs(mx[1]))} m ${mx[1] >= 0 ? 'acima' : 'abaixo'} do modelo 2 em ${mx[0]}, a maior diferença` : 'O boletim não traz o modelo 2 para este mês') + ` (modelos 1 | 2 do boletim, leitura gráfica ±0,15 m)`; }
  else tx.push(D.sipam.prog.some((p) => p.estacao === e.nome) ? 'Sem mês de modelo do boletim dentro da janela' : 'O boletim não traz modelos mensais para esta estação');
  if (rr != null && (h == null || h > 3.5)) tx.push(`Nas ${cmp.length} estações comuns a variação em 15 d do painel e do boletim tem r = ${num(rr, 2)}`);
  $('#cs-t').textContent = e.nome + ' · janela ' + (h == null ? 'Ano' : st.jan + ' d') + ' · boletim ' + dmy(D.sipam.boletim) + '. ' + tx.join('. ') + '.';
  $('#cs-tab tbody').innerHTML = rows.length ? rows.map((q, i) => `<tr><td>${esc(q[0])}</td><td class="n">${q[1]}</td><td class="n">${q[2]}</td><td class="n">${q[3]}</td></tr>`).join('') : '<tr><td colspan="4">Sem dados do boletim para esta estação.</td></tr>';
  $('#cs-n').textContent = 'Níveis em ' + u + '. Dif. = painel − SipamHidro (modelo 2 nos meses).';
}

// ---------- diagnóstico ----------
function diag() {
  const R = X.list, u = uni(), k = (e, v) => num(vv(e, v));
  $('#dg-t').textContent = 'Diagnóstico e prognóstico de nível · ' + dmy(D.hoje);
  $('#dg-c').textContent = 'Níveis em ' + u + ', no formato do boletim SipamHidro.';
  const neg = R.filter((e) => e.r.L0 - e.nr < 0), baixo = R.filter((e) => e.r.L0 - e.nr >= 0 && e.r.L0 - e.nr < 1), vaz = R.filter((e) => e.r.taxa < 0), mm = [...R].sort((a, b) => (a.r.min - a.nr) - (b.r.min - b.nr))[0];
  $('#dg-sint').innerHTML = `<li>${vaz.length} de ${R.length} estações em vazante (taxa média de 7 d: ${num(vaz.length ? mean(vaz.map((e) => e.r.taxa)) : 0, 1)} cm/dia).</li>
    <li>${neg.length ? esc(neg.map((e) => e.nome).join(', ')) + ' abaixo do NR (' + neg.map((e) => num(e.r.L0 - e.nr) + ' m').join('; ') + '). ' : 'Nenhuma estação abaixo do NR. '}${baixo.length ? baixo.length + ' com menos de 1 m acima do NR: ' + esc(baixo.map((e) => e.nome).join(', ')) + '.' : ''}</li>
    <li>Previsão: ${R.filter((e) => e.r.cruza).length} estações cruzam o NR nos próximos 100 dias; menor nível previsto em ${esc(mm.nome)} (${num(mm.r.min - mm.nr)} m acima do NR em ${dm(mm.r.minData)}).</li>`;
  const host = $('#dg-rios'); host.innerHTML = '';
  const rios = [...new Set(R.map((e) => e.rio))];
  rios.forEach((rio, ri) => { host.insertAdjacentHTML('beforeend', `<div class="rio">${ri + 1}. ${esc(rio)}</div>`);
    R.filter((e) => e.rio === rio).forEach((e, si) => { const r = e.r, sf = (v, l) => (v == null ? '—' : k(e, v) + ' [' + k(e, l[0]) + '; ' + k(e, l[1]) + ']'), c15 = D.sipam.var15.find((s) => s.codigo_ana && s.codigo_ana === e.ana), prog = D.sipam.prog.filter((p) => p.estacao === e.nome);
      const div = document.createElement('div'); div.className = 'est';
      const left = document.createElement('div'); left.innerHTML = `<h4>${ri + 1}.${si + 1}. Níveis do rio nos últimos 15 dias na estação: ${esc(e.nome)}${e.ana ? ' (ANA ' + e.ana + ')' : ''}</h4><div class="mini"></div><p class="cap">Variação das cotas nos últimos 15 dias: ${sg(r.d15, 0)} cm, em média ${sg(r.d15 / 15, 2)} cm por dia.</p>`; $('.mini', left).append(miniFig(e));
      const rows = [['Cota atual', k(e, r.L0) + ' ' + u + ' (' + dm(r.data) + ')' + (ref() ? '' : ' · ' + num(r.L0 - e.nr) + ' m acima do NR')], ['Tendência 7 d', sg(r.taxa, 1) + ' cm/dia'], ['Previsão em ' + dm(r.dataF[0]), sf(r.f7, r.lim7) + ' m'], ['Previsão em ' + dm(r.dataF[2]), sf(r.f30, r.lim30) + ' m'], ['Mínimo previsto', k(e, r.min) + ' m em ' + dm(r.minData) + (r.minBorda ? ' (fim do horizonte)' : '')], ['Cruzamento do NR', r.cruza ? dm(r.cruza) : 'não prevista em 100 dias']];
      if (c15) rows.push(['SipamHidro, 15 d', sg(c15.var15_cm, 0) + ' cm (painel − boletim: ' + sg(r.d15 - c15.var15_cm, 0) + ' cm)']);
      if (prog.length) rows.push(['SipamHidro, Modelo 2', prog.map((p) => MES[+p.mes.slice(5) - 1] + ': ' + (p.modelo2_cm == null ? '—' : num(p.modelo2_cm / 100 - off(e)))).join(' · ')]);
      const right = document.createElement('dl'); right.className = 'kv'; right.innerHTML = rows.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join(''); div.append(left, right); host.append(div); }); });
  $('#dg-h3').textContent = '3. Correlação com o boletim SipamHidro (' + dmy(D.sipam.boletim) + ')';
  $('#dg-cc').textContent = 'Quadro B em ' + u + '; painel = mínima do mês (observado + previsto).';
  const cmp = []; for (const e of R) { const s = D.sipam.var15.find((x) => x.codigo_ana && x.codigo_ana === e.ana); if (s && e.r.d15 != null) cmp.push({ e, p: e.r.d15, s: s.var15_cm }); }
  $('#t-c15 tbody').innerHTML = cmp.map((c) => `<tr><td>${esc(c.e.nome)}</td><td class="n">${sg(c.p, 0)}</td><td class="n">${sg(c.s, 0)}</td><td class="n">${sg(c.p - c.s, 0)}</td></tr>`).join('');
  let rr = null; if (cmp.length > 2) { const mx = mean(cmp.map((c) => c.p)), my = mean(cmp.map((c) => c.s)); rr = cmp.reduce((a, c) => a + (c.p - mx) * (c.s - my), 0) / Math.sqrt(cmp.reduce((a, c) => a + (c.p - mx) ** 2, 0) * cmp.reduce((a, c) => a + (c.s - my) ** 2, 0)); }
  $('#dg-r').textContent = cmp.length ? `n = ${cmp.length} estações comuns; r = ${num(rr, 3)}; diferença média ${sg(mean(cmp.map((c) => c.p - c.s)), 1)} cm (painel − boletim).` : '';
  const mes = [];
  for (const p of D.sipam.prog) { const e = R.find((x) => x.nome === p.estacao); if (!e) continue; const [ano, mm2] = p.mes.split('-').map(Number), t0 = e.r.t0, v = []; e.m.forEach((val, f) => { const d = new Date(f * DAY); if (d.getUTCFullYear() === ano && d.getUTCMonth() + 1 === mm2) v.push(val); }); for (let h = 1; h <= 100; h++) { const d = new Date((t0 + h) * DAY); if (d.getUTCFullYear() === ano && d.getUTCMonth() + 1 === mm2 && e.prev.f[h] != null) v.push(e.prev.f[h]); } mes.push({ e, p, mn: v.length ? Math.min(...v) : null }); }
  $('#t-cm tbody').innerHTML = mes.map(({ e, p, mn }) => `<tr><td>${esc(e.nome)}</td><td>${MES[+p.mes.slice(5) - 1]}/${p.mes.slice(0, 4)}</td><td class="n">${p.modelo1_cm == null ? '—' : num(p.modelo1_cm / 100 - off(e))}</td><td class="n">${p.modelo2_cm == null ? '—' : num(p.modelo2_cm / 100 - off(e))}</td><td class="n">${mn == null ? '—' : num(mn - off(e))}</td></tr>`).join('');
  const mont = ['Tabatinga', 'Fonte Boa', 'Beruri', 'Manacapuru / Manaquiri', 'Moura', 'Cucuí', 'Itaituba'].map((n) => { const s = D.sipam.var15.find((x) => x.estacao === n); return s ? n + ' ' + sg(s.var15_cm, 0) + ' cm' : null; }).filter(Boolean);
  $('#dg-mont').textContent = 'Estações a montante no boletim (variação em 15 d): ' + mont.join('; ') + '.';
  const ult = mes.map((x) => x.p.mes).sort().pop(), dif = mes.filter((x) => x.p.mes === ult && x.p.modelo2_cm != null && x.mn != null).map((x) => x.e.nome + ' (' + sg(x.p.modelo2_cm / 100 - x.mn, 1) + ' m)');
  $('#dg-cons').innerHTML = `<li>Em ${ult ? MES[+ult.slice(5) - 1].toLowerCase() : '—'}, modelo 2 − painel (mínima): ${esc(dif.join('; '))}. O painel não usa dados de montante; o boletim sim.</li><li>O z usa só 2020–2025 (inclui 2023 e 2024); o boletim usa a média histórica longa.</li>`;
}

// ---------- referência vertical ----------
let rfLog = LS.get('log', []);
function rfReset() { const e = E(); $('#rf-est').value = e.id; $('#rf-nr').value = e.nr; $('#rf-leit').value = e.r.L0; rfCalc('leit'); }
function rfCalc(from) {
  const nr = parseFloat($('#rf-nr').value), l = parseFloat($('#rf-leit').value), c = parseFloat($('#rf-col').value);
  if (from === 'leit' || from === 'nr') { if (isFinite(l) && isFinite(nr)) $('#rf-col').value = (Math.round((l - nr) * 100) / 100).toFixed(2); } else if (from === 'col' && isFinite(c) && isFinite(nr)) $('#rf-leit').value = (Math.round((c + nr) * 100) / 100).toFixed(2);
  const col = parseFloat($('#rf-col').value), s = parseFloat($('#rf-sond').value), cal = parseFloat($('#rf-cal').value), pr = s + col, sq = parseFloat($('#rf-sq').value), uk = col + s - cal - (isFinite(sq) ? sq : 0);
  $('#rs-col').textContent = isFinite(col) ? sg(col) + ' m' : '—'; $('#rs-prof').textContent = isFinite(pr) ? num(pr) + ' m' : '—'; const u = $('#rs-ukc'); u.textContent = isFinite(uk) ? sg(uk) + ' m' : '—'; u.style.color = uk < 0 ? 'var(--bad)' : '';
}
['leit', 'nr', 'col'].forEach((k) => $('#rf-' + k).addEventListener('input', () => rfCalc(k))); ['sond', 'cal', 'sq'].forEach((k) => $('#rf-' + k).addEventListener('input', () => rfCalc('x')));
$('#rf-est').addEventListener('change', (ev) => { st.est = ev.target.value; LS.set('est', st.est); rfReset(); });
$('#rf-ult').addEventListener('click', () => { $('#rf-leit').value = E().r.L0; rfCalc('leit'); });
$('#rf-nrad').addEventListener('click', () => { $('#rf-nr').value = E().nr; rfCalc('nr'); });
function rfTabela() { $('#rf-log tbody').innerHTML = rfLog.length ? rfLog.map((r0) => { const r = r0.length === 9 ? [...r0.slice(0, 8), '—', r0[8]] : r0; return r; }).map((r) => `<tr>${r.map((c, i) => `<td class="${i > 1 ? 'n' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('') : '<tr><td colspan="10">Nenhum registro.</td></tr>'; }
$('#rf-reg').addEventListener('click', () => { const v = (i) => parseFloat($('#' + i).value); if (!isFinite(v('rf-col'))) return; const col = v('rf-col'), pr = v('rf-sond') + col; rfLog.unshift([new Date().toLocaleString('pt-BR'), E().nome, num(v('rf-leit')), num(v('rf-nr')), sg(col), num(v('rf-sond')), num(pr), num(v('rf-cal')), num(isFinite(v('rf-sq')) ? v('rf-sq') : 0), sg(col + v('rf-sond') - v('rf-cal') - (isFinite(v('rf-sq')) ? v('rf-sq') : 0))]); rfLog = rfLog.slice(0, 300); LS.set('log', rfLog); rfTabela(); toast('Conversão registrada neste aparelho.'); });
$('#rf-clear').addEventListener('click', () => { if (rfLog.length && confirm('Apagar todos os registros deste aparelho?')) { rfLog = []; LS.set('log', rfLog); rfTabela(); } });
$('#rf-copy').addEventListener('click', () => copiar(['data_hora;estacao;leitura_m;nr_m;coluna_m;sondagem_m;profundidade_m;calado_m;squat_m;faq_m', ...rfLog.map((r) => (r.length === 9 ? [...r.slice(0, 8), '', r[8]] : r).join(';'))].join('\n').replace(/−/g, '-'), 'Registros copiados (CSV).'));
function refPag() {
  const sel = $('#rf-est'); if (!sel.options.length) sel.innerHTML = X.list.map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join(''); sel.value = st.est; if (!$('#rf-nr').value) rfReset();
  $('#t-nr tbody').innerHTML = X.list.map((e) => { const f = (v) => num(v, 3).replace(/,?0$/, ''); return `<tr><td>${esc(e.nome)}</td><td>${esc(e.carta)}</td><td>${esc(e.rn)}</td><td class="n">${num(e.nr_rn_cm)}</td><td class="n">${num(e.zero_rn_cm)}</td><td class="n">${f(e.nr_f43)}</td><td class="n" style="font-weight:600">${f(e.nr)}</td><td>${esc(e.fonte_nr)}${Math.abs(e.nr - e.nr_f43) > 0.0005 ? ' (' + sg(e.nr - e.nr_f43) + ' m vs. F-43)' : ''}</td><td><a href="files/${fileOf(e.nome)}" target="_blank" rel="noopener">F-43 (PDF)</a></td></tr>`; }).join(''); rfTabela();
}

// ---------- ciência e dados ----------
function csvSerie() {
  const ds = new Set(); X.list.forEach((e) => e.m.forEach((v, f) => ds.add(f))); const dias = [...ds].sort((a, b) => a - b);
  const h = ['data', ...X.list.flatMap((e) => [e.nome + '_regua_m', e.nome + '_acima_NR_m'])];
  return [h.join(';'), ...dias.map((f) => [ISO(f), ...X.list.flatMap((e) => { const v = e.m.get(f); return v === undefined ? ['', ''] : [num(v), num(v - e.nr)]; })].join(';'))].join('\n');
}
$('#b-csv-s').addEventListener('click', () => baixar('serie_integrada_ZP1.csv', csvSerie()));
function cie() {
  $('#cie-d').textContent = 'Fonte: planilha de leituras de régua. Dados até ' + dmy(D.hoje) + '.';
  $('#t-dados tbody').innerHTML = X.list.map((e) => { const ks = [...e.m.keys()], a = Math.min(...ks), b = Math.max(...ks); return `<tr><td>${esc(e.nome)}</td><td>${dmy(ISO(a))}</td><td>${dmy(ISO(b))}</td><td class="n">${ks.length}</td><td class="n">${num((ks.length / (b - a + 1)) * 100, 1)}%</td><td class="n">${D.qc.filter((q) => q.estacao === e.nome).length}</td><td class="n">${e.prev.anos_clim}</td></tr>`; }).join('');
  $('#t-val tbody').innerHTML = X.list.map((e) => { const c = (h) => { const s = e.prev.skill.find((x) => x.h === h); return `<td class="n">${s && s.metodo != null ? num(s.metodo) + ' (' + num(s.persistencia) + ')' : '—'}</td>`; }; return `<tr><td>${esc(e.nome)}</td><td class="n">${e.prev.n_origens}</td>${c(7)}${c(15)}${c(30)}${c(60)}${c(90)}</tr>`; }).join('');
  $('#qc-sum').textContent = 'Leituras descartadas pelo controle de qualidade (' + D.qc.length + ')';
  $('#t-qc tbody').innerHTML = [...D.qc].sort((a, b) => a.estacao.localeCompare(b.estacao) || a.data.localeCompare(b.data)).map((r) => `<tr><td>${esc(r.estacao)}</td><td>${r.data}</td><td class="n">${num(r.regua)}</td><td class="n">${num(r.mediana_local)}</td><td class="n">${sg(r.desvio_m)}</td></tr>`).join('');
  const ds = $('#dl-est'); if (!ds.options.length) { ds.innerHTML = X.list.map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join(''); ds.value = st.est; ds.onchange = leit; $('#dl-det').ontoggle = leit; $('#dl-copy').onclick = () => { const e = X.list.find((z) => z.id === ds.value), ks = [...e.m.keys()].sort((x, y) => x - y); copiar(['data;regua_m;acima_nr_m', ...ks.map((f) => ISO(f) + ';' + e.m.get(f).toFixed(2) + ';' + (e.m.get(f) - e.nr).toFixed(2))].join('\n'), 'Leituras de ' + e.nome + ' copiadas (CSV).'); }; }
  function leit() { if (!$('#dl-det').open) return; const e = X.list.find((z) => z.id === ds.value), ks = [...e.m.keys()].sort((x, y) => y - x); $('#dl-n').textContent = ks.length + ' dias · ' + dmy(ISO(ks[ks.length - 1])) + ' a ' + dmy(ISO(ks[0])); $('#dl-tab tbody').innerHTML = ks.map((f) => `<tr><td>${dmy(ISO(f))}</td><td class="n">${num(e.m.get(f))}</td><td class="n">${num(e.m.get(f) - e.nr)}</td></tr>`).join(''); }
  leit();
  const g = new Date(D.gerado); $('#cie-u').textContent = 'Dados gerados em ' + g.toLocaleString('pt-BR') + '. O app confere se há versão nova ao abrir e ao voltar para ele.';
}
$('#b-recarregar').addEventListener('click', async () => { try { const m = await carregar(false); redraw(); toast(m ? 'Dados novos carregados (' + dmy(D.hoje) + ').' : 'Você já está com a versão mais recente (' + dmy(D.hoje) + ').'); if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then((r) => r && r.update()); } catch (e) { toast('Sem conexão: usando os dados guardados.'); } });

// ---------- resumo do dia (histórias) ----------
let sIdx = 0, sT = null, cards = [];
function montarCards() {
  const R = X.list, u = ref() ? 'm acima do NR' : 'm na régua', c = (e, v) => num(vv(e, v)), raso = [...R].sort((a, b) => (a.r.L0 - a.nr) - (b.r.L0 - b.nr))[0], vaz = [...R].sort((a, b) => a.r.taxa - b.r.taxa)[0];
  const neg = R.filter((e) => e.r.L0 - e.nr < 0), cruz = R.filter((e) => e.r.cruza).sort((a, b) => a.r.cruza.localeCompare(b.r.cruza)), mm = [...R].sort((a, b) => (a.r.min - a.nr) - (b.r.min - b.nr))[0];
  const rosto = (arr, f) => '<ul>' + arr.map((e) => `<li><span>${esc(e.nome)}</span><b>${f(e)}</b></li>`).join('') + '</ul>';
  const cmp = []; for (const e of R) { const s = D.sipam.var15.find((x) => x.codigo_ana && x.codigo_ana === e.ana); if (s && e.r.d15 != null) cmp.push(Math.abs(e.r.d15 - s.var15_cm)); }
  return [
    { k: 'Hoje · ' + dmy(D.hoje), big: R.filter((e) => e.r.taxa < 0).length + '/' + R.length, t: 'estações em vazante', s: 'Taxa média de 7 d: ' + num(mean(R.map((e) => e.r.taxa)), 1) + ' cm/dia. Níveis em ' + u + '.' },
    { k: 'Menor coluna d’água', big: sg(vv(raso, raso.r.L0)) + ' m', t: raso.nome + ' (' + raso.rio + ')', s: neg.length ? 'Abaixo do NR: ' + neg.map((e) => e.nome).join(', ') + '.' : 'Nenhuma estação abaixo do NR.' },
    { k: 'Maior vazante', big: sg(vaz.r.taxa, 1), t: 'cm/dia em ' + vaz.nome, s: 'Δ em 15 dias: ' + sg(vaz.r.d15, 0) + ' cm.' },
    { k: 'Previsão em ' + dm(R[0].r.dataF[0]), big: '', t: 'Estações mais rasas em +7 dias (' + u + ')', list: rosto([...R].sort((a, b) => (a.r.f7 - a.nr) - (b.r.f7 - b.nr)).slice(0, 4), (e) => c(e, e.r.f7) + ' m') },
    { k: 'Cruzamento do NR previsto', big: cruz.length ? String(cruz.length) : '0', t: cruz.length ? 'estações cruzam o NR em 100 dias' : 'Nenhuma cruza o NR', list: cruz.length ? rosto(cruz.slice(0, 5), (e) => dm(e.r.cruza)) : '' },
    { k: 'Mínimo previsto', big: sg(mm.r.min - mm.nr) + ' m', t: mm.nome + ' em ' + dm(mm.r.minData), s: 'Faixa empírica 95% em +30 d: ' + c(mm, mm.r.lim30[0]) + ' a ' + c(mm, mm.r.lim30[1]) + ' m (' + u + ').' },
    { k: 'SipamHidro · ' + dm(D.sipam.boletim), big: cmp.length ? '±' + num(mean(cmp), 0) + ' cm' : '—', t: 'diferença média da variação em 15 dias', s: 'Painel × boletim, ' + cmp.length + ' estações comuns.' },
  ];
}
function abrirStory(i) {
  if (!X) return; cards = montarCards(); sIdx = i || 0; const s = $('#story'); s.hidden = false; document.body.style.overflow = 'hidden'; storyRender();
}
function storyRender() {
  clearTimeout(sT); const s = $('#story'), c = cards[sIdx], red = matchMedia('(prefers-reduced-motion:reduce)').matches;
  $('#stbar').innerHTML = cards.map((_, i) => `<i class="${i < sIdx ? 'ok' : i === sIdx && !red ? 'on' : i === sIdx ? 'ok' : ''}"></i>`).join('');
  $('#stc').innerHTML = `<div class="k">${esc(c.k)}</div>${c.big ? `<div class="big">${esc(c.big)}</div>` : ''}<div class="t">${esc(c.t)}</div>${c.s ? `<div class="s">${esc(c.s)}</div>` : ''}${c.list || ''}`;
  s.style.setProperty('--dur', '7s'); if (!red) sT = setTimeout(() => storyNext(), 7000);
}
const storyNext = () => { if (sIdx < cards.length - 1) { sIdx++; storyRender(); } else fecharStory(); };
const storyPrev = () => { if (sIdx > 0) { sIdx--; storyRender(); } };
function fecharStory() { clearTimeout(sT); $('#story').hidden = true; document.body.style.overflow = ''; }
$('#stl').addEventListener('click', storyPrev); $('#str').addEventListener('click', storyNext); $('#stx').addEventListener('click', fecharStory);
(() => { const s = $('#story'); let y0 = null; s.addEventListener('touchstart', (e) => { y0 = e.touches[0].clientY; s.classList.add('pause'); clearTimeout(sT); }, { passive: true }); s.addEventListener('touchend', (e) => { s.classList.remove('pause'); if (y0 != null && e.changedTouches[0].clientY - y0 > 100) fecharStory(); else if (!s.hidden) storyRender(); y0 = null; }, { passive: true }); })();

// ---------- busca ----------
let bItens = [], bSel = 0;
function abrirBusca() { if (!X) return; const d = $('#dlg-busca'); $('#bq').value = ''; buscaLista(''); d.showModal(); $('#bq').focus(); }
function buscaLista(q) {
  const n = norm(q), acoes = [['Resumo do dia', 'Ação', () => abrirStory()], ['Alternar referencial (NR / régua)', 'Ação', () => { st.ref = ref() ? 'regua' : 'nr'; LS.set('ref', st.ref); redraw(); }], ['Alternar modo escuro', 'Ação', () => $('#b-tema').click()], ['Janela 30 dias', 'Gráfico', () => { st.jan = '30'; LS.set('jan', '30'); show('prev'); }], ['Janela 90 dias', 'Gráfico', () => { st.jan = '90'; LS.set('jan', '90'); show('prev'); }], ['Janela ano todo', 'Gráfico', () => { st.jan = '365'; LS.set('jan', '365'); show('prev'); }], ['Exportar série integrada (CSV)', 'Ação', () => $('#b-csv-s').click()], ['Como instalar o app', 'Ação', () => abrirInstalar()]];
  const abas = [['Previsão', 'prev'], ['Diagnóstico', 'diag'], ['Referência vertical', 'ref'], ['Ciência e dados', 'cie']].map(([t, v]) => [t, 'Seção', () => show(v)]);
  const ests = X.list.map((e) => [e.nome + ' · ' + e.rio, 'Estação', () => { st.est = e.id; LS.set('est', e.id); show('prev'); }]);
  bItens = [...ests, ...abas, ...acoes].filter(([t]) => !n || norm(t).includes(n)).slice(0, 14); bSel = 0;
  $('#bl').innerHTML = bItens.map(([t, k], i) => `<li role="option" data-i="${i}" aria-selected="${i === 0}"><span>${esc(t)}</span><small>${k}</small></li>`).join('') || '<li><span>Nada encontrado</span></li>';
}
const buscaIr = (i) => { const it = bItens[i]; if (!it) return; $('#dlg-busca').close(); it[2](); };
$('#bq').addEventListener('input', (e) => buscaLista(e.target.value));
$('#bq').addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); bSel = (bSel + (e.key === 'ArrowDown' ? 1 : -1) + bItens.length) % bItens.length; $$('#bl li').forEach((li, i) => li.setAttribute('aria-selected', String(i === bSel))); } else if (e.key === 'Enter') buscaIr(bSel); });
$('#bl').addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) buscaIr(+li.dataset.i); });
$('#dlg-busca').addEventListener('click', (e) => { if (e.target.id === 'dlg-busca') e.target.close(); });
addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirBusca(); } else if (e.key === 'Escape') { if (!$('#story').hidden) fecharStory(); else if (!$('#ovl').hidden) fecharSheet(); } else if (!$('#story').hidden) { if (e.key === 'ArrowRight') storyNext(); if (e.key === 'ArrowLeft') storyPrev(); } });

// ---------- instalação (orientação; o prático confirma no aparelho) ----------
let evInst = null;
const standalone = () => matchMedia('(display-mode:standalone)').matches || navigator.standalone === true;
function plataforma() { const ua = navigator.userAgent; if (/WhatsApp|Instagram|FBAN|FBAV|Telegram|Line\//i.test(ua)) return 'app'; if (/iPhone|iPad|iPod/i.test(ua)) return 'ios'; if (/Android/i.test(ua)) return 'android'; return 'desktop'; }
function abrirInstalar() {
  const p = plataforma(), blocos = {
    android: ['Android (Chrome)', 'Abra este link no Chrome. Toque no menu ⋮ e em “Instalar app” (ou “Adicionar à tela inicial”). Confirme na janela que aparecer.'],
    ios: ['iPhone (Safari)', 'Abra este link no Safari. Toque em Compartilhar (quadrado com seta), depois em “Adicionar à Tela de Início” e em Adicionar.'],
    desktop: ['Computador (Chrome ou Edge)', 'Clique no ícone de instalar na barra de endereço, ou no menu ⋮ → “Instalar Rios ZP-1”. Confirme.'],
    app: ['Navegador do aplicativo', 'Você abriu o link dentro de outro aplicativo (WhatsApp, Instagram…). Copie o endereço e abra no Chrome (Android) ou no Safari (iPhone).'] };
  const ordem = [p, ...['android', 'ios', 'desktop'].filter((x) => x !== p)];
  $('#inst-b').innerHTML = ordem.filter((k) => blocos[k]).map((k) => `<div class="inst-p${k === p ? ' me' : ''}"><b>${blocos[k][0]}${k === p ? ' · seu aparelho' : ''}</b><br>${blocos[k][1]}</div>`).join('');
  $('#inst-go').hidden = !evInst; $('#dlg-inst').showModal();
}
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); evInst = e; });
addEventListener('appinstalled', () => { evInst = null; $('#ban').hidden = true; });
$('#inst-go').addEventListener('click', async () => { if (!evInst) return; const p = evInst; evInst = null; $('#dlg-inst').close(); p.prompt(); });
$('#inst-x').addEventListener('click', () => $('#dlg-inst').close()); $('#dlg-inst').addEventListener('click', (e) => { if (e.target.id === 'dlg-inst') e.target.close(); });
$('#b-instalar').addEventListener('click', abrirInstalar); $('#ban-como').addEventListener('click', abrirInstalar);
$('#ban-x').addEventListener('click', () => { $('#ban').hidden = true; LS.set('ban-x', Date.now()); });
function banner() { if (standalone() || Date.now() - LS.get('ban-x', 0) < 14 * DAY) return; const p = plataforma(); $('#ban-t').textContent = p === 'ios' ? 'Para usar como app: Safari → Compartilhar → Adicionar à Tela de Início.' : p === 'android' ? 'Para usar como app: Chrome → menu ⋮ → Instalar app.' : p === 'app' ? 'Abra este link no Chrome ou no Safari para instalar o app.' : 'Este site pode ser instalado como app (PWA).'; $('#ban').hidden = false; if (new URLSearchParams(location.search).has('instalar')) abrirInstalar(); }

// ---------- ciclo ----------
function redraw() {
  if (!X) return; const safe = (f) => { try { f(); } catch (e) { console.error(e); } };
  $$('#seg-ref button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.r === st.ref)));
  $$('.view').forEach((s) => { s.hidden = s.id !== 'v-' + st.tab; });
  $$('#tabs button,#bnav button').forEach((b) => { if (b.dataset.v === st.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  safe(prever); if (st.tab === 'diag') safe(diag); if (st.tab === 'ref') safe(refPag); if (st.tab === 'cie') safe(cie);
}
let lastW = 0; if ('ResizeObserver' in window) new ResizeObserver(([en]) => { const w = Math.round(en.contentRect.width); if (w && w !== lastW) { lastW = w; if (X && st.tab === 'prev') safe2(grafico); } }).observe($('#chart'));
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (X && st.tab === 'prev') safe2(grafico); }, 150); });
const safe2 = (f) => { try { f(); } catch (e) { console.error(e); } };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && D && Date.now() - lastCheck > 30 * 60 * 1000) { lastCheck = Date.now(); carregar(true).then((m) => m && redraw()).catch(() => {}); } });
let lastCheck = Date.now();
async function iniciar() {
  layout(); tema(); banner();
  if ('serviceWorker' in navigator && !window.__ZP1__) { navigator.serviceWorker.register('sw.js').then((r) => { r.addEventListener('updatefound', () => { const w = r.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Nova versão do app disponível.', 'Atualizar', () => location.reload()); }); }); }).catch(() => {}); }
  try { await carregar(false); } catch (e) { $('#carga').innerHTML = '<div class="fail">Não foi possível carregar os dados. Verifique a conexão e tente de novo.</div>'; return; }
  $('#carga').hidden = true; show(st.tab);
}
iniciar();
})();
