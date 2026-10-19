(() => {
'use strict';
const DAY = 864e5, MES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const root = document.documentElement;
const LS = { get(k, d) { try { const v = localStorage.getItem('zp1-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('zp1-' + k, JSON.stringify(v)); } catch (e) {} } };
const NFc = {}, nf = (d) => NFc[d] || (NFc[d] = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d }));
const num = (v, d = 2) => { if (v == null || !isFinite(v)) return '—'; if (Math.abs(v) < 0.5 * 10 ** -d) v = 0; return nf(d).format(v).replace('-', '−'); };
const sg = (v, d = 2) => { if (v == null || !isFinite(v)) return '—'; const r = Math.round(Math.abs(v) * 10 ** d); return (r === 0 ? '' : v < 0 ? '−' : '+') + nf(d).format(r / 10 ** d); };
const dnum = (s) => Date.parse(s + 'T00:00:00Z') / DAY, ISO = (d) => new Date(d * DAY).toISOString().slice(0, 10);
const dm = (s) => (s ? s.slice(8, 10) + '/' + s.slice(5, 7) : '—'), dmy = (s) => (s ? dm(s) + '/' + s.slice(0, 4) : '—');
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
const NS = 'http://www.w3.org/2000/svg';
const sv = (t, a = {}, k = []) => { const n = document.createElementNS(NS, t); for (const [x, v] of Object.entries(a)) if (v != null) n.setAttribute(x, v); for (const c of [].concat(k)) if (c != null) n.append(c); return n; };
const lin = (d0, d1, r0, r1) => { const f = (v) => r0 + ((v - d0) / (d1 - d0)) * (r1 - r0); f.inv = (v) => d0 + ((v - r0) / (r1 - r0)) * (d1 - d0); return f; };
const ticks = (lo, hi, n) => { const raw = (hi - lo) / n, p = 10 ** Math.floor(Math.log10(raw)), f = raw / p, s = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p, a = Math.ceil(lo / s) * s, o = []; for (let v = a; v <= hi + 1e-9; v += s) o.push(Math.round(v / s) * s); return { t: o, s }; };
const pth = (pts, fx, fy, def = (p) => p.v != null) => { let d = '', pen = false; for (const p of pts) { if (!def(p)) { pen = false; continue; } d += (pen ? 'L' : 'M') + fx(p.f).toFixed(1) + ' ' + fy(p.v).toFixed(1); pen = true; } return d; };
const band = (pts, a, b, fx, fy) => { const q = pts.filter((p) => p[a] != null && p[b] != null); if (q.length < 2) return ''; return 'M' + q.map((p) => fx(p.f).toFixed(1) + ' ' + fy(p[b]).toFixed(1)).join('L') + 'L' + [...q].reverse().map((p) => fx(p.f).toFixed(1) + ' ' + fy(p[a]).toFixed(1)).join('L') + 'Z'; };
const fileOf = (n) => norm(n).replace(/ /g, '_') + '_nr.pdf';

const APP_VER = '1.13';
const APP_URL = 'https://maregrafista.github.io/Rios-ZP-1/', ART = !!window.__ZP1__;
const TEXTO_APP = `*Rios ZP-1* · nível e previsão dos rios da Zona de Praticagem 1 (Manaus, Itacoatiara, Parintins, Juruti, Óbidos, Santarém, Oriximiná e Porto Trombetas).

• Nível observado e previsão de 100 dias, sempre em relação ao NR da carta (ou ao zero da régua)
• Alerta de cruzamento do NR e comparação com o boletim SipamHidro
• Calculadora de FAQ (folga abaixo da quilha) com calado e squat
• Para celular e computador; instale pelo navegador (Android: Chrome ⋮ › Instalar app; iPhone: Safari › Compartilhar › Adicionar à Tela de Início)

Previsões empíricas, de caráter informativo.
${APP_URL}`;
const PAL = { soft: ['#332288', '#88CCEE', '#117733', '#DDCC77', '#AA4499', '#888888', '#44AA99', '#CC6677'], dk: ['#9C93E8', '#88CCEE', '#4DB88A', '#DDCC77', '#D68AC4', '#AEAEAE', '#44AA99', '#CC6677'], hc: ['#33BBEE', '#009988', '#EE7733', '#CC3311', '#EE3377', '#0077BB', '#BBBBBB', '#555555'] };
const CORES = { bad: 'var(--bad)', warn: 'var(--warn)', ok: 'var(--ok)' };
const st = { est: LS.get('est', 'manaus'), ref: LS.get('ref', 'nr'), jan: ['7', '15', '30', '45', '60', '90', '120', '180', '365'].includes(LS.get('jan', '365')) ? LS.get('jan', '365') : '30', hc: LS.get('hc', false), sub: LS.get('sub', 'prev'), pal: LS.get('paleta', 'marinho'), tab: LS.get('tab', 'prev'), anos: null, cam: Object.assign({ anom: true, prev: true, tend: true, nom: true, emp: true, med: false, ref: true, sip: true }, LS.get('cam', {})) };
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
  X.anos = []; for (let y = X.cur - 7; y <= X.cur; y++) X.anos.push(y);
  if (!st.anos) st.anos = new Set(X.anos);
  if (!X.E.has(st.est)) st.est = D.estacoes[0].id;
  for (const e of D.estacoes) e.r = resumir(e);
  X.list = [...D.estacoes].sort((a, b) => a.ordem - b.ordem);
  X.ativas = X.list.filter((e) => e.r.atraso <= 45);  // estações com leitura recente: só elas entram em sínteses e rotação
}
// ---------- climatologia do dia e anomalia (escala do SipamHidro: desvio-padrão em relação à média do dia) ----------
const ANOS_CLIM = 30, CL = new Map(), ZK = (z) => { const a = Math.abs(z); return (z < 0 ? -1 : 1) * (a < 1 ? 0 : a < 1.5 ? 1 : a < 2 ? 2 : a < 3 ? 3 : 4); };
const ZN = ['Normalidade', 'leve', 'moderada', 'severa', 'extrema'], zcond = (z) => { if (z == null) return 'Sem base'; const k = ZK(z); return k === 0 ? 'Normalidade' : 'Anomalia ' + (k < 0 ? 'negativa ' : 'positiva ') + ZN[Math.abs(k)]; };
const zcor = (k) => (k === 0 ? 'var(--z0)' : k > 0 ? 'var(--zp' + k + ')' : 'var(--zn' + -k + ')');
function clima(e) {
  const key = e.id + D.gerado; if (CL.has(key)) return CL.get(key);
  const m = e.m, cur = X.cur, tab = new Map(), y0 = +e.ini.slice(0, 4);
  for (let mo = 0; mo < 12; mo++) for (let dd = 1; dd <= 31; dd++) {
    if (new Date(Date.UTC(2021, mo, dd)).getUTCMonth() !== mo) continue;
    const ys = [];  // média de ±5 d em cada um dos 30 anos mais recentes com dado nesta data
    for (let y = cur - 1; y >= y0 && ys.length < ANOS_CLIM; y--) { const b = Date.UTC(y, mo, dd) / DAY; let a = 0, n = 0; for (let j = -5; j <= 5; j++) { const v = m.get(b + j); if (v !== undefined) { a += v; n++; } } if (n >= 6) ys.push(a / n); }
    if (ys.length >= 8) { const mu = mean(ys); tab.set(mo * 32 + dd, [mu, Math.sqrt(ys.reduce((a, b) => a + (b - mu) ** 2, 0) / (ys.length - 1)) || 0.01, ys.length]); }
  }
  CL.set(key, tab); return tab;
}
function climAt(e, f) { const d = new Date(f * DAY), mo = d.getUTCMonth(), dd = d.getUTCDate(); return clima(e).get(mo * 32 + (mo === 1 && dd === 29 ? 28 : dd)) || null; }
function resumir(e) {
  const p = e.prev, t0 = dnum(p.origem), nr = e.nr, m = e.m, atraso = X.hojeN - t0;
  const ant = (d) => { for (let k = 0; k <= 3; k++) { const v = m.get(t0 - d - k); if (v !== undefined) return v; } return null; };
  const dif = (d) => { const v = ant(d); return v == null ? null : Math.round((p.L0 - v) * 100); };
  const q0 = climAt(e, t0), mu = q0 ? q0[0] : null, sd = q0 ? q0[1] : null, z = q0 ? (p.L0 - mu) / sd : null, cond = zcond(z), zk = z == null ? 0 : ZK(z);
  const qf = climAt(e, X.HOJE + 30), z30 = qf && p.f[30 + atraso] != null ? (p.f[30 + atraso] - qf[0]) / qf[1] : null;
  const at = (h) => { const i = h + atraso; return i <= 100 && p.f[i] != null ? p.f[i] : null; };
  let mn = null, mi = null, last = 0; for (let i = 0; i <= 100; i++) if (p.f[i] != null) { last = i; if (mn == null || p.f[i] < mn) { mn = p.f[i]; mi = i; } }
  let cruza = null; for (let i = 1; i <= 100; i++) if (p.f[i] != null && p.f[i] - nr <= 0) { cruza = i; break; }
  const dias = cruza == null ? null : Math.max(0, cruza - atraso), n0 = p.L0 - nr;
  let s = { t: 'Normal', c: 'ok' };
  if (n0 < 0) s = { t: 'Abaixo do NR', c: 'bad' }; else if (dias != null && dias <= 7) s = { t: 'Cruza o NR em ' + dias + ' d', c: 'bad' }; else if (dias != null && dias <= 15) s = { t: 'Cruza o NR em ' + dias + ' d', c: 'warn' }; else if (n0 < 1) s = { t: 'Menos de 1 m do NR', c: 'warn' };
  if (atraso > 45) s = { t: 'Sem leitura recente', c: 'warn' }; else if (p.f.every((v) => v == null)) s = { t: 'Sem previsão (histórico curto)', c: 'warn' };
  const o = { data: p.origem, t0, atraso, nr, taxa: Math.round(p.taxa_cm_dia * 10) / 10, d1: dif(1), d7: dif(7), d15: dif(15), mu, sd, z: z == null ? null : Math.round(z * 100) / 100, zk, z30, cond, s, L0: p.L0,
    f7: at(7), f15: at(15), f30: at(30), min: mn, minData: mi == null ? null : ISO(t0 + mi), minBorda: mi === last, cruza: cruza == null ? null : ISO(t0 + cruza) };
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
  const nvp = document.createElement('meta'); nvp.name = 'viewport'; nvp.content = mode === 'desktop' && phone ? 'width=1024,initial-scale=1,viewport-fit=cover' : 'width=device-width,initial-scale=1,viewport-fit=cover'; if (vp) vp.replaceWith(nvp); else document.head.append(nvp);
  ajustaZoom();
  if (X) { setTimeout(redraw, 60); setTimeout(redraw, 400); }
}
function ajustaZoom() { const phone = matchMedia('(pointer:coarse)').matches && screen.width <= 800, w = innerWidth; root.style.zoom = root.dataset.layout === 'mobile' && phone && w > 500 ? String(Math.min(3, w / 460)) : ''; }
addEventListener('resize', () => { ajustaZoom(); });
$$('#seg-lay button').forEach((b) => b.addEventListener('click', () => { LS.set('layout', b.dataset.l); layout(); redraw(); }));
matchMedia('(max-width:800px)').addEventListener('change', () => { if (LS.get('layout', 'auto') === 'auto') { layout(); redraw(); } });
const dark = () => (root.dataset.theme === 'dark' || (root.dataset.theme !== 'light' && matchMedia('(prefers-color-scheme:dark)').matches));
function tema() { const d = dark(); $('#aj-tema').textContent = d ? 'Escuro' : 'Claro'; $('#aj-pal').textContent = st.pal === 'amazonia' ? 'Amazônia' : 'Marinho'; $('#b-tema').innerHTML = d ? '<svg viewBox="0 0 24 24" width="20" height="20"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' : '<svg viewBox="0 0 24 24" width="20" height="20"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>'; const tc = $('meta[name=theme-color]'); if (tc) tc.content = st.pal === 'amazonia' ? (d ? '#0a2a21' : '#0c3b2c') : '#0b1f4d'; }
function paleta() { if (st.pal === 'amazonia') root.dataset.paleta = 'amazonia'; else delete root.dataset.paleta; tema(); }
$('#b-pal').addEventListener('click', () => { st.pal = st.pal === 'amazonia' ? 'marinho' : 'amazonia'; LS.set('paleta', st.pal); paleta(); redraw(); toast('Cores: ' + (st.pal === 'amazonia' ? 'Amazônia' : 'Marinho') + '.'); });
$('#b-tema').addEventListener('click', () => { const n = dark() ? 'light' : 'dark'; root.dataset.theme = n; LS.set('tema', n); tema(); redraw(); });
matchMedia('(prefers-color-scheme:dark)').addEventListener('change', () => { tema(); redraw(); });
function show(v) { st.tab = v; LS.set('tab', v); $$('#tabs button,#bnav button').forEach((b) => { if (b.dataset.v === v) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); }); $$('.view').forEach((s) => { s.hidden = s.id !== 'v-' + v; }); scrollTo(0, 0); redraw(); }
$$('#tabs button,#bnav button').forEach((b) => b.addEventListener('click', () => show(b.dataset.v)));
$$('#seg-ref button').forEach((b) => b.addEventListener('click', () => { st.ref = b.dataset.r; LS.set('ref', st.ref); redraw(); }));
$$('#seg-jan button').forEach((b) => b.addEventListener('click', () => { st.jan = b.dataset.j; LS.set('jan', st.jan); redraw(); }));
$('#b-aj').addEventListener('click', () => $('#dlg-aj').showModal()); $('#aj-x').addEventListener('click', () => $('#dlg-aj').close()); $('#dlg-aj').addEventListener('click', (e) => { if (e.target.id === 'dlg-aj') e.target.close(); });
$('#aj-res').addEventListener('click', () => { $('#dlg-aj').close(); resumoDia(); });
$('#aj-inst').addEventListener('click', () => { $('#dlg-aj').close(); abrirInstalar(); });
if (window.ResizeObserver) new ResizeObserver(() => root.style.setProperty('--toph', $('.top').offsetHeight + 'px')).observe($('.top'));

// ---------- avisos ----------
let toastT;
function toast(t, label, fn) { const b = $('#toast'); $('#toast-t').textContent = t; const bt = $('#toast-b'); bt.textContent = label || 'OK'; bt.onclick = () => { b.hidden = true; fn && fn(); }; b.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => { b.hidden = true; }, 9000); }
async function copiar(txt, msg) { try { await navigator.clipboard.writeText(txt); toast(msg || 'Copiado.'); } catch (e) { const ta = document.createElement('textarea'); ta.value = txt; document.body.append(ta); ta.select(); try { document.execCommand('copy'); toast(msg || 'Copiado.'); } catch (x) { toast('Não foi possível copiar.'); } ta.remove(); } }
function baixar(nome, txt, tipo) { if (ART) return copiar(txt.replace(/−/g, '-'), 'Dados copiados (CSV). Cole em uma planilha.'); const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿' + txt.replace(/−/g, '-')], { type: tipo || 'text/csv;charset=utf-8' })); a.download = nome; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); }

// ---------- folha (bottom sheet) ----------
function abrirSheet(titulo, html) { $('#sh-t').textContent = titulo; $('#sh-b').innerHTML = html; $('#ovl').hidden = false; document.body.style.overflow = 'hidden'; $('#sh-x').focus(); return $('#sh-b'); }
function fecharSheet() { $('#ovl').hidden = true; document.body.style.overflow = ''; }
$('#sh-x').addEventListener('click', fecharSheet); $('#ovl').addEventListener('click', (e) => { if (e.target.id === 'ovl') fecharSheet(); });
(() => { let y0 = null; const sh = $('#sheet'); sh.addEventListener('touchstart', (e) => { y0 = sh.scrollTop === 0 ? e.touches[0].clientY : null; }, { passive: true }); sh.addEventListener('touchmove', (e) => { if (y0 != null && e.touches[0].clientY - y0 > 90) { y0 = null; fecharSheet(); } }, { passive: true }); })();
function sheetEstacao(id) {
  const e = X.E.get(id), r = e.r, c = (v) => num(vv(e, v)), lm = (v) => (v == null ? '—' : c(v) + ' m');
  const html = `<p class="jk">${esc(e.rio)}${e.ana ? ' · ANA ' + e.ana : ''} · NR ${num(e.nr)} m na régua</p>
    <p class="jp"><span class="pill ${r.s.c}">${esc(r.s.t)}</span><span>${esc(r.cond)}, z = ${num(r.z, 2)}</span></p>
    <table class="jt"><caption>Tabela. Situação em ${dm(r.data)} (${uni()}).</caption><tbody>
      <tr><th>Nível</th><td>${c(r.L0)} m</td></tr>
      <tr><th>Variação em 24 h · 7 d</th><td>${sg(r.d1, 0)} · ${sg(r.d7, 0)} cm</td></tr>
      <tr><th>Taxa de 7 d</th><td>${sg(r.taxa, 1)} cm/d</td></tr>
      <tr><th>Previsão em +7 d</th><td>${lm(r.f7)}</td></tr>
      <tr><th>Previsão em +15 d</th><td>${lm(r.f15)}</td></tr>
      <tr><th>Previsão em +30 d</th><td>${lm(r.f30)}</td></tr>
      <tr><th>Mínimo previsto</th><td>${c(r.min)} m em ${dm(r.minData)}</td></tr>
      <tr><th>Cruzamento do NR</th><td>${r.cruza ? dm(r.cruza) : 'não prevista'}</td></tr></tbody></table>
    <figure class="jf"><div class="mini" id="sh-mini"></div><figcaption><b>Figura.</b> Observado (preto) e previsão (laranja tracejada); barras: variação diária.</figcaption></figure>
    <div class="jb"><button class="btn pri" id="sh-abrir" type="button">Abrir no principal</button><button class="btn" id="sh-conv" type="button">Calcular FAQ</button><button class="btn" id="sh-comp" type="button">Compartilhar</button></div>`;
  const b = abrirSheet(e.nome, html); $('#sh-mini', b).append(miniFig(e, 380, 210));
  $('#sh-abrir', b).onclick = () => { fecharSheet(); st.est = id; LS.set('est', id); show('prev'); };
  $('#sh-comp', b).onclick = () => compartilhar(id);
  $('#sh-conv', b).onclick = () => { fecharSheet(); st.est = id; LS.set('est', id); rfReset(); show('ref'); };
}
function compartilhar(id) {
  const e = X.E.get(id || st.est), r = e.r, c = (v) => num(vv(e, v));
  const txt = `Rios ZP-1 · ${e.nome} (${e.rio}), ${dm(r.data)}: ${c(r.L0)} ${uni()}${ref() ? ' (régua ' + num(r.L0) + ' m)' : ''}; ${r.taxa < 0 ? 'vazante' : 'enchente'} ${num(Math.abs(r.taxa), 1)} cm/d. +7 d: ${c(r.f7)} m; +30 d: ${c(r.f30)} m. Mínimo previsto ${c(r.min)} m em ${dm(r.minData)}. ${APP_URL}`;
  if (navigator.share) navigator.share({ title: 'Rios ZP-1', text: txt }).catch(() => {}); else copiar(txt, 'Texto copiado.');
}

// ---------- gráfico ----------
const colAno = (y) => (y === X.cur ? 'var(--ink)' : (st.hc ? PAL.hc : dark() ? PAL.dk : PAL.soft)[(y - X.anos[0]) % 8]);
const CAM = [['anom', 'Faixas de anomalia', 'f', 'var(--zp2)'], ['prev', 'Previsão', 'd', 'var(--fc)'], ['tend', 'Tendência +7 d', 'd', 'var(--trend)'], ['ref', 'NR', '', 'var(--bad)'], ['sip', 'Prev. SipamHidro', '', 'var(--sip)']];
function controles() {
  const r = $('#row-cam'); $$('.tg', r).forEach((x) => x.remove());
  for (const [k, t0, cl, c] of CAM) { const t = t0; const b = document.createElement('button'); b.type = 'button'; b.className = 'tg'; b.style.setProperty('--c', c); b.setAttribute('aria-pressed', String(st.cam[k])); b.innerHTML = `<i class="${cl}"></i>${t}`; b.onclick = () => { st.cam[k] = !st.cam[k]; LS.set('cam', st.cam); redraw(); }; r.append(b); }
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
  const W = Math.max(300, box.clientWidth), Ht = Math.round(document.body.classList.contains('ap') ? Math.max(420, innerHeight - 250) : W < 520 ? Math.max(320, Math.min(innerHeight * 0.64, W * 1.2)) : Math.max(400, Math.min(innerHeight * 0.72, W * 0.62, 700))), mg = { t: 14, r: W < 520 ? 52 : 54, b: 32, l: W < 520 ? 42 : 52 };
  const val = (y, f) => { const d = new Date(f * DAY), mo = d.getUTCMonth(), dd = d.getUTCDate(); if (mo === 1 && dd === 29) return null; const ty = d.getUTCFullYear() - (cur - y), v = m.get(Date.UTC(ty, mo, dd) / DAY); return v === undefined ? null : v - o; };
  const lines = [];
  for (const y of X.anos) { if (!st.anos.has(y)) continue; const pts = []; for (let f = Math.floor(x0); f <= x1; f++) { if (y === cur) { if (f > orig) continue; const v = m.get(f); pts.push({ f, v: v === undefined ? null : v - o }); } else pts.push({ f, v: val(y, f) }); } lines.push({ y, pts, c: colAno(y), w: (y === cur ? (st.hc ? 3.2 : 2.8) : (st.hc ? 2.2 : 1.4)) * (W > 900 ? 1.25 : 1) }); }
  const fc = []; for (let h = 0; h <= 100; h++) { const f = orig + h; if (f < x0 || f > x1 || P.f[h] == null) continue; fc.push({ f, h, v: P.f[h] - o }); }
  const r7 = P.taxa_cm_dia / 100, trend = [{ f: orig, v: P.L0 - o }, { f: orig + 7, v: P.L0 + r7 * 7 - o }];
  const sip = []; if (c.sip) for (const r of D.sipam.prog) if (r.estacao === e.nome) { const f = Date.UTC(+r.mes.slice(0, 4), +r.mes.slice(5, 7) - 1, 15) / DAY; if (f >= x0 && f <= x1) { if (r.modelo1_cm != null) sip.push({ f, v: r.modelo1_cm / 100 - o, k: 1 }); if (r.modelo2_cm != null) sip.push({ f, v: r.modelo2_cm / 100 - o, k: 2 }); } }
  const ys = []; for (const l of lines) for (const p of l.pts) if (p.v != null) ys.push(p.v);
  for (const p of fc) { if (c.prev || st.anos.has(cur)) ys.push(p.v); } for (const p of sip) ys.push(p.v); if (c.ref) ys.push(ref() ? 0 : e.nr); if (c.anom) for (let f = Math.floor(x0); f <= x1; f += 5) { const q = climAt(e, f); if (q) ys.push(q[0] - o - 1.5 * q[1], q[0] - o + 1.5 * q[1]); }
  let lo = Math.min(...(ys.length ? ys : [0])), hi = Math.max(...(ys.length ? ys : [1])); if (hi - lo < 0.5) { hi += 0.25; lo -= 0.25; } const pd = (hi - lo) * 0.04; lo -= pd; hi += pd;
  const tk = ticks(lo, hi, 7); lo = Math.min(lo, tk.t[0]); hi = Math.max(hi, tk.t[tk.t.length - 1]);
  const xs = lin(x0, x1, mg.l, W - mg.r), yl = lin(lo, hi, Ht - mg.b, mg.t), xa = Ht - mg.b;
  const svg = sv('svg', { width: '100%', viewBox: `0 0 ${W} ${Ht}`, height: Ht, role: 'img', 'aria-label': 'Hidrograma de ' + e.nome });
  if (orig < x1) svg.append(sv('rect', { x: xs(Math.max(orig, x0)), y: mg.t, width: xs(x1) - xs(Math.max(orig, x0)), height: xa - mg.t, fill: 'var(--fc)', opacity: 0.045 })); if (orig < x1 && xs(x1) - xs(Math.max(orig, x0)) > 60) svg.append(sv('text', { x: xs(x1) - 4, y: xa - 6, 'text-anchor': 'end', style: 'fill:var(--fc);font-style:italic' }, 'previsão'));
  if (c.anom) {
    const pz = (f, k) => { const q = climAt(e, f); return q ? [xs(f), yl(Math.max(lo, Math.min(hi, q[0] - o + k * q[1])))] : null; }, A = [];
    const poly = (a, b) => { const up = [], dn = []; for (let f = Math.floor(x0); f <= x1; f++) { const u = pz(f, b), l = pz(f, a); if (u) { up.push(u); dn.push(l); } } return up.length < 2 ? '' : 'M' + up.map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'L' + dn.reverse().map((q) => q[0].toFixed(1) + ' ' + q[1].toFixed(1)).join('L') + 'Z'; };
    for (const [a, b, k] of [[-1, 1, 0], [1, 1.5, 1], [1.5, 2, 2], [2, 3, 3], [3, 999, 4], [-1.5, -1, -1], [-2, -1.5, -2], [-3, -2, -3], [-999, -3, -4]]) { const d = poly(a, b); if (d) svg.append(sv('path', { d, fill: zcor(k), stroke: 'none' })); }
    const mm = []; for (let f = Math.floor(x0); f <= x1; f++) { const q = climAt(e, f); if (q) mm.push({ f, v: q[0] - o }); }
    if (mm.length > 1) svg.append(sv('path', { d: pth(mm, xs, yl), fill: 'none', stroke: 'var(--mut)', 'stroke-width': 1.2, 'stroke-dasharray': '5 3', opacity: 0.9 }));
  }
  const fmtY = (v) => num(v, tk.s < 1 ? 1 : 0);
  for (const v of tk.t) { svg.append(sv('line', { x1: mg.l, x2: W - mg.r, y1: yl(v), y2: yl(v), stroke: 'var(--grid)', 'stroke-width': 0.8 })); svg.append(sv('line', { x1: mg.l - 4, x2: mg.l, y1: yl(v), y2: yl(v), stroke: 'var(--ink)', 'stroke-width': 0.9 })); svg.append(sv('text', { x: mg.l - 7, y: yl(v) + 3.5, 'text-anchor': 'end' }, fmtY(v))); }
  svg.append(sv('line', { x1: mg.l, x2: W - mg.r, y1: xa, y2: xa, stroke: 'var(--ink)', 'stroke-width': 0.9 })); svg.append(sv('line', { x1: mg.l, x2: mg.l, y1: mg.t, y2: xa, stroke: 'var(--ink)', 'stroke-width': 0.9 }));
  const lab = (f) => { const d = new Date(f * DAY); return String(d.getUTCDate()).padStart(2, '0') + ' ' + MES[d.getUTCMonth()]; };
  if (st.jan === '365' || st.jan === '180') {
    let d = new Date(x0 * DAY); d = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) / DAY;
    while (d <= x1) { const dd = new Date(d * DAY), nx = Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth() + 1, 1) / DAY; if (d >= x0) { svg.append(sv('line', { x1: xs(d), x2: xs(d), y1: xa, y2: xa + 5, stroke: 'var(--line)' })); if (d > x0) svg.append(sv('line', { x1: xs(d), x2: xs(d), y1: mg.t, y2: xa, stroke: 'var(--grid)', 'stroke-dasharray': '1 3' })); } const a = Math.max(d, x0), b = Math.min(nx, x1); if (b - a >= 14) svg.append(sv('text', { x: xs((a + b) / 2), y: xa + 18, 'text-anchor': 'middle' }, (W < 460 ? MES[dd.getUTCMonth()][0] : MES[dd.getUTCMonth()]) + (dd.getUTCMonth() === 0 && st.jan === '180' ? ' ' + dd.getUTCFullYear() : ''))); d = nx; }
  } else {
    const sm = W < 520, step = { 7: 1, 15: sm ? 3 : 1, 30: sm ? 10 : 5, 45: sm ? 15 : 5, 120: sm ? 30 : 15, 60: sm ? 20 : 10, 90: sm ? 30 : 15 }[st.jan] || 15;
    for (let k = -Math.floor((HOJE - x0) / step); HOJE + k * step <= x1; k++) { const f = HOJE + k * step; if (f < x0) continue; svg.append(sv('line', { x1: xs(f), x2: xs(f), y1: mg.t, y2: xa, stroke: 'var(--grid)', 'stroke-dasharray': '1 3' })); svg.append(sv('line', { x1: xs(f), x2: xs(f), y1: xa, y2: xa + 4, stroke: 'var(--ink)', 'stroke-width': 0.9 })); svg.append(sv('text', { x: xs(f), y: xa + 17, 'text-anchor': 'middle' }, lab(f))); }
  }
  svg.append(sv('text', { transform: `translate(11 ${(mg.t + xa) / 2}) rotate(-90)`, 'text-anchor': 'middle' }, ref() ? 'Nível acima do NR (m)' : 'Leitura da régua (m)'));
  if (c.ref) { const yr = ref() ? 0 : e.nr; svg.append(sv('line', { x1: mg.l, x2: W - mg.r, y1: yl(yr), y2: yl(yr), stroke: 'var(--bad)', 'stroke-width': 1.4 })); svg.append(sv('text', { x: mg.l + 4, y: yl(yr) - 4, fill: 'var(--bad)', style: 'fill:var(--bad)' }, 'NR' + (ref() ? '' : ' ' + num(e.nr) + ' m'))); }
  for (const l of [...lines].sort((a, b) => (a.y === cur) - (b.y === cur))) { const d = pth(l.pts, xs, yl); if (l.y === cur) svg.append(sv('path', { d, fill: 'none', stroke: 'var(--panel)', 'stroke-width': l.w + 3, opacity: 0.85, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })); svg.append(sv('path', { d, fill: 'none', stroke: l.c, 'stroke-width': l.w, opacity: l.y === cur ? 1 : 0.92, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' })); }
  if (c.prev && fc.length > 1) { const d = pth(fc, xs, yl); svg.append(sv('path', { d, fill: 'none', stroke: 'var(--panel)', 'stroke-width': 6, opacity: 0.85 })); svg.append(sv('path', { d, fill: 'none', stroke: 'var(--fc)', 'stroke-width': (st.hc ? 3.2 : 2.8) * (W > 900 ? 1.25 : 1), 'stroke-dasharray': '6 3.5' })); }
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
    const pc = lines.find((l) => l.y === cur), vo = q && f > orig && c.prev ? q.v : (pc && f <= orig ? (pc.pts.find((u) => u.f === f) || {}).v : null), qz = c.anom ? climAt(e, f) : null, zt = qz && vo != null ? (vo + o - qz[0]) / qz[1] : null;
    tip.innerHTML = `<div class="h">${lab(f)}${f > HOJE ? ' · +' + (f - HOJE) + ' d' : ''}</div>` + rows.map((r) => `<div class="r"><span><i style="--c:${r.c}"></i>${r.t}</span><b>${num(r.v)}</b></div>`).join('') + (zt != null ? `<div class="n"><i class="zs" style="background:${zcor(ZK(zt))}"></i>${sg(zt, 1)} σ · ${zcond(zt)}<br>Média do dia: ${num(qz[0] - o)} (±1 σ: ${num(qz[1])})</div>` : '');
    tip.style.opacity = 1; const tw = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(W - tw - 4, px + 14 + tw > W ? px - tw - 14 : px + 14)) + 'px'; tip.style.top = Math.max(4, Math.min(Ht - tip.offsetHeight - 4, py - 20)) + 'px';
  };
  ov.addEventListener('pointermove', mover); ov.addEventListener('pointerdown', mover); ov.addEventListener('pointerleave', () => { tip.style.opacity = 0; cross.setAttribute('opacity', 0); dots.replaceChildren(); });
  svg.append(ov); box.replaceChildren(svg, tip);
  const lg = []; if (st.anos.has(cur)) lg.push(['', 'var(--ink)', 'Observado ' + cur]); if (c.prev) lg.push(['d', 'var(--fc)', 'Previsão']); if (c.tend) lg.push(['t', 'var(--trend)', 'Tendência 7 d']); if (c.sip) lg.push(['s', 'var(--sip)', 'Prev. SipamHidro']);
  const zl = c.anom ? '<span class="zleg"><b>Anomalia (σ)</b><span class="zb">' + [-4, -3, -2, -1, 0, 1, 2, 3, 4].map((k) => `<i style="background:${zcor(k)}"></i>`).join('') + '</span><em>−3 σ ◂ normal ▸ +3 σ; tracejado = média do dia</em></span>' : '';
  $('#leg').innerHTML = lg.map(([k, col, t]) => `<span><i class="${k}" style="--c:${col}"></i>${t}</span>`).join('') + zl;
  const head = ['data', ...lines.map((l) => l.y), 'previsao'], csv = [head.join(';')];
  for (let f = Math.floor(x0); f <= x1; f++) { const q = fcm.get(f); csv.push([ISO(f), ...lines.map((l) => { const p = l.pts.find((z) => z.f === f); return p && p.v != null ? num(p.v) : ''; }), q ? num(q.v) : ''].join(';')); }
  csvG = '# ' + e.nome + ' · ' + uni() + '\n' + csv.join('\n');
}
$('#b-csv-g').addEventListener('click', () => baixar('grafico_' + st.est + '.csv', csvG));

$('#hero').addEventListener('click', (ev) => { const b = ev.target.closest('[data-a]'); if (!b) return; ({ resumo: () => resumoDia(), comp: () => compartilhar(), conv: () => { rfReset(); show('ref'); }, ficha: () => sheetEstacao(st.est) })[b.dataset.a](); });

// ---------- modo apresentação (telão: tela cheia, rotação automática das estações) ----------
const AP_S = 15; let apT = null, apN = 0, apPausa = false, apFS = false;
function apBarra() { const e = E(), i = X.ativas.findIndex((z) => z.id === e.id) + 1; $('#ap-t').textContent = e.nome + ' · ' + i + '/' + X.ativas.length; $('#ap-p').textContent = apPausa ? '▶' : '❚❚'; $('#ap-p').setAttribute('aria-label', apPausa ? 'Continuar rotação' : 'Pausar rotação'); }
function apresentar(on) {
  document.body.classList.toggle('ap', on); $('#ap-bar').hidden = !on; clearInterval(apT); apN = 0; apPausa = false;
  if (on) {
    st.tab = 'prev'; subtab('prev'); scrollTo(0, 0);
    try { if (document.documentElement.requestFullscreen && !document.fullscreenElement) { document.documentElement.requestFullscreen().then(() => { apFS = true; }).catch(() => {}); } } catch (e) {}
    apT = setInterval(() => { if (apPausa) return; apN += 0.25; $('#ap-g').style.width = Math.min(100, (apN / AP_S) * 100) + '%'; if (apN >= AP_S) { apN = 0; trocaEst(1); } }, 250);
  } else { apFS = false; try { if (document.fullscreenElement) document.exitFullscreen(); } catch (e) {} }
  redraw(); if (on) apBarra();
}
$('#b-ap').addEventListener('click', () => apresentar(true)); $('#ap-x').addEventListener('click', () => apresentar(false));
$('#ap-p').addEventListener('click', () => { apPausa = !apPausa; apBarra(); }); $('#ap-a').addEventListener('click', () => { apN = 0; trocaEst(-1); }); $('#ap-n').addEventListener('click', () => { apN = 0; trocaEst(1); });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && apFS && document.body.classList.contains('ap')) apresentar(false); });
addEventListener('keydown', (ev) => { if (!document.body.classList.contains('ap')) return; if (ev.key === 'Escape') apresentar(false); else if (ev.key === ' ') { ev.preventDefault(); apPausa = !apPausa; apBarra(); } else if (ev.key === 'ArrowRight') { apN = 0; trocaEst(1); } else if (ev.key === 'ArrowLeft') { apN = 0; trocaEst(-1); } });

// ---------- previsão ----------
function miniFig(e, W = 380, Ht = 230) {
  const r = e.r, P = e.prev, o = off(e), orig = dnum(P.origem), x0 = orig - 15, x1 = orig + 15, nr = ref() ? 0 : e.nr, pts = [], fc = [];
  for (let f = x0; f <= orig; f++) if (e.m.has(f)) pts.push({ f, v: e.m.get(f) - o });
  for (let h = 0; h <= 15; h++) if (P.f[h] != null) { const v = P.f[h] - o; fc.push({ f: orig + h, v }); }
  const svg = sv('svg', { width: '100%', viewBox: `0 0 ${W} ${Ht}`, height: Ht, role: 'img', 'aria-label': 'Últimos 15 dias e previsão de 15 dias, ' + e.nome }); if (pts.length < 3) return svg;
  const L = 40, Rr = W - 46, top = 14, yb = 142, ys = [...pts.map((p) => p.v), ...fc.map((p) => p.v)];
  let lo = Math.min(...ys), hi = Math.max(...ys); if (nr >= lo - 0.6 && nr <= hi + 0.6) { lo = Math.min(lo, nr); hi = Math.max(hi, nr); } if (hi - lo < 0.4) { hi += 0.2; lo -= 0.2; }
  const tk = ticks(lo, hi, 4); lo = Math.min(lo, tk.t[0]); hi = Math.max(hi, tk.t[tk.t.length - 1]); const xs = lin(x0, x1, L, Rr), yl = lin(lo, hi, yb, top);
  svg.append(sv('rect', { x: xs(orig), y: top, width: Rr - xs(orig), height: yb - top, fill: 'var(--fc)', opacity: 0.05 }));
  for (const v of tk.t) { svg.append(sv('line', { x1: L, x2: Rr, y1: yl(v), y2: yl(v), stroke: 'var(--grid)', 'stroke-width': 0.8 })); svg.append(sv('text', { x: L - 5, y: yl(v) + 3.5, 'text-anchor': 'end' }, num(v, tk.s < 1 ? 1 : 0))); }
  svg.append(sv('line', { x1: L, x2: L, y1: top, y2: yb, stroke: 'var(--ink)', 'stroke-width': 0.9 })); svg.append(sv('line', { x1: L, x2: Rr, y1: yb, y2: yb, stroke: 'var(--ink)', 'stroke-width': 0.9 }));
  if (nr >= lo && nr <= hi) { svg.append(sv('line', { x1: L, x2: Rr, y1: yl(nr), y2: yl(nr), stroke: 'var(--bad)', 'stroke-width': 1.2 })); svg.append(sv('text', { x: L + 3, y: yl(nr) - 3, style: 'fill:var(--bad)' }, 'NR')); }
  svg.append(sv('path', { d: pth(pts, xs, yl), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
  svg.append(sv('path', { d: pth(fc, xs, yl), fill: 'none', stroke: 'var(--fc)', 'stroke-width': 2.4, 'stroke-dasharray': '5 3' }));
  const a = pts[pts.length - 1], b = fc[fc.length - 1];
  svg.append(sv('circle', { cx: xs(a.f), cy: yl(a.v), r: 3.6, fill: 'var(--ink)', stroke: 'var(--panel)', 'stroke-width': 1.5 }));
  if (b) { svg.append(sv('circle', { cx: xs(b.f), cy: yl(b.v), r: 3.2, fill: 'var(--fc)', stroke: 'var(--panel)', 'stroke-width': 1.5 })); svg.append(sv('text', { x: Rr + 4, y: yl(b.v) + 3.5, style: 'fill:var(--fc);font-weight:600' }, num(b.v))); }
  svg.append(sv('text', { x: xs(a.f) - 4, y: Math.max(yl(a.v) - 8, top + 8), 'text-anchor': 'end', style: 'fill:var(--ink);font-weight:600' }, num(a.v)));
  svg.append(sv('text', { x: Rr, y: top - 3, 'text-anchor': 'end' }, uni()));
  const dl = []; for (let i = 1; i < pts.length; i++) if (pts[i].f - pts[i - 1].f === 1) dl.push({ f: pts[i].f, v: Math.round((pts[i].v - pts[i - 1].v) * 100) });
  const m2 = Math.max(2, ...dl.map((d) => Math.abs(d.v))), y2 = lin(-m2, m2, Ht - 20, yb + 34), bw = Math.max(3, (xs(orig) - L) / 16 - 2);
  svg.append(sv('line', { x1: L, x2: xs(orig), y1: y2(0), y2: y2(0), stroke: 'var(--line)' }));
  for (const d of dl) svg.append(sv('rect', { x: xs(d.f) - bw / 2, width: bw, y: d.v < 0 ? y2(0) : y2(d.v), height: Math.max(1, Math.abs(y2(d.v) - y2(0))), rx: 1.5, fill: d.v < 0 ? 'var(--bad)' : 'var(--sel)', opacity: 0.85 }));
  svg.append(sv('text', { x: L, y: yb + 28 }, 'Δ diária (cm)')); svg.append(sv('text', { x: L - 5, y: y2(m2) + 3, 'text-anchor': 'end' }, '+' + m2)); svg.append(sv('text', { x: L - 5, y: y2(-m2) + 3, 'text-anchor': 'end' }, '−' + m2));
  for (const f of [x0, x0 + 5, x0 + 10, orig, orig + 5, orig + 10, x1]) { svg.append(sv('line', { x1: xs(f), x2: xs(f), y1: yb, y2: yb + 4, stroke: 'var(--ink)', 'stroke-width': 0.9 })); if (f !== x0 + 10 || true) svg.append(sv('text', { x: xs(f), y: Ht - 4, 'text-anchor': 'middle' }, dm(ISO(f)))); }
  return svg;
}
// ---------- esquema do sistema fluvial (seleção de estação) ----------
const POS = { manaus: [30, 'b'], itacoatiara: [90, 'a'], parintins: [150, 'b'], juruti: [205, 'a'], obidos: [255, 'b'], santarem: [308, 'b'], oriximina: [255, 'r', 56], 'porto-trombetas': [196, 'l', 22] };
function mapa() {
  const host = $('#chips'), YL = 104, svg = sv('svg', { viewBox: '0 0 340 152', width: '100%', role: 'group', 'aria-label': 'Estações no sistema fluvial' }), seta = (v) => (v <= -1 ? '↓' : v >= 1 ? '↑' : '→');
  svg.append(sv('path', { d: `M8 ${YL}H320`, class: 'rv' }), sv('path', { d: `M255 ${YL}V56L196 22`, class: 'rv' }), sv('path', { d: `M316 ${YL - 6}l8 6-8 6`, class: 'rv', fill: 'none' }));
  svg.append(sv('text', { x: 232, y: 36, class: 'rn', 'text-anchor': 'middle' }, 'Rio Trombetas'));
  for (const e of X.list) {
    const p = POS[e.id]; if (!p) continue; const [x, pos, y0] = p, y = y0 || YL, on = e.id === st.est, r = e.r, lvl = ref() ? sg(vv(e, r.L0)) : num(r.L0), nome = e.nome.replace('Porto Trombetas', 'P. Trombetas');
    const g = sv('g', { class: 'nd' + (on ? ' on' : ''), tabindex: 0, role: 'button', 'aria-label': e.nome + ', ' + lvl + ' ' + uni() + ', ' + r.s.t, 'aria-pressed': String(on) });
    g.append(sv('circle', { cx: x, cy: y, r: 22, fill: 'transparent' }), sv('circle', { cx: x, cy: y, r: on ? 10 : 7.5, class: 'dt', fill: CORES[r.s.c] }));
    const tx = pos === 'b' ? [x, y + 25, y + 39, 'middle'] : pos === 'a' ? [x, y - 29, y - 15, 'middle'] : pos === 'r' ? [x + 14, y - 1, y + 13, 'start'] : [x - 14, y - 1, y + 13, 'end'];
    g.append(sv('text', { x: tx[0], y: tx[1], 'text-anchor': tx[3], class: 'nn' }, nome), sv('text', { x: tx[0], y: tx[2], 'text-anchor': tx[3], class: 'nl' }, lvl + ' ' + seta(r.taxa)));
    const go = () => { st.est = e.id; LS.set('est', e.id); redraw(); }; g.addEventListener('click', go); g.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); go(); } }); svg.append(g);
  }
  const leg = document.createElement('div'); leg.className = 'mleg'; leg.innerHTML = '<span><i class="dot bad"></i>abaixo do NR</span><span><i class="dot warn"></i>atenção</span><span><i class="dot ok"></i>normal</span><span>↓ vazante ↑ cheia</span>';
  const outras = X.list.filter((e) => !POS[e.id]);
  if (outras.length) { const o = document.createElement('div'); o.className = 'outras'; o.innerHTML = '<span>Outras:</span>'; for (const e of outras) { const b = document.createElement('button'); b.type = 'button'; b.className = 'ot'; b.setAttribute('aria-pressed', String(e.id === st.est)); b.innerHTML = `<span class="dot ${e.r.s.c}"></span>${esc(e.nome)} · ${ref() ? sg(vv(e, e.r.L0)) : num(e.r.L0)}`; b.onclick = () => { st.est = e.id; LS.set('est', e.id); redraw(); }; o.append(b); } host.replaceChildren(svg, o, leg); } else host.replaceChildren(svg, leg);
}
function trocaEst(d) { const L = document.body.classList.contains('ap') ? X.ativas : X.list, i = L.findIndex((e) => e.id === st.est), n = L[(i + d + L.length) % L.length]; st.est = n.id; LS.set('est', n.id); redraw(); }
function subtab(set) { if (set) { st.sub = set; LS.set('sub', set); } if (!['prev', 'sip', 'all'].includes(st.sub)) st.sub = 'prev'; $$('#seg-sub button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.s === st.sub))); $$('.sb').forEach((d) => { d.hidden = d.id !== 'sb-' + st.sub; }); }
$$('#seg-sub button').forEach((b) => b.addEventListener('click', () => subtab(b.dataset.s)));
function anomHtml(r) {
  if (r.z == null) return '';
  const pc = Math.max(0, Math.min(100, ((r.z + 3.5) / 7) * 100)), w = [0.5, 1, 0.5, 0.5, 2, 0.5, 0.5, 1, 0.5], ks = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  return `<div class="anm" role="img" aria-label="${esc(r.cond)}, ${num(r.z, 1)} desvios-padrão em relação à média do dia"><span class="al">Anomalia</span><div class="az">${ks.map((k, i) => `<i style="flex:${w[i]};background:${zcor(k)}"></i>`).join('')}<b class="mk" style="left:${pc}%"></b></div><span class="av"><b>${sg(r.z, 1)} σ</b> · ${esc(r.cond)}${r.z30 != null ? ' · em +30 d: ' + sg(r.z30, 1) + ' σ' : ''}</span></div>`;
}
function prever() {
  const e = E(), r = e.r, c = (v) => num(vv(e, v)), atr = r.atraso;
  const atras = Math.floor(Date.now() / DAY - dnum(D.hoje)); $('#sub').textContent = 'Leituras até ' + dmy(D.hoje) + (atras >= 3 ? ' (há ' + atras + ' d)' : '') + ' · ' + (ref() ? 'm acima do NR' : 'm na régua');
  $('#hero').innerHTML = `<div class="hh"><div class="nome"><b>${esc(e.nome)}</b> · ${esc(e.rio)} · ${dm(r.data)}${atr ? ' (' + atr + ' d sem leitura)' : ''}</div><button class="btn dt" data-a="ficha" type="button">Detalhes</button></div>
    <div class="hb"><span class="big">${ref() ? sg(vv(e, r.L0)) : num(r.L0)}<small> ${uni()}</small></span><span class="pill ${r.s.c}">${esc(r.s.t)}</span><span class="cap">${ref() ? 'régua ' + num(r.L0) + ' m' : 'NR ' + num(e.nr) + ' m na régua'}</span></div>
    ${anomHtml(r)}
    <div class="hg"><i>Observado</i><div><span>Taxa 7 d</span><b>${sg(r.taxa, 1)} cm/d</b></div><div><span>Var. 24 h</span><b>${sg(r.d1, 0)} cm</b></div><div><span>Var. 7 d</span><b>${sg(r.d7, 0)} cm</b></div>
    <i>Previsto</i><div><span>+7 d · ${dm(r.dataF[0])}</span><b>${c(r.f7)} m</b></div><div><span>+30 d · ${dm(r.dataF[2])}</span><b>${c(r.f30)} m</b></div><div><span>Mínimo · ${dm(r.minData)}</span><b>${c(r.min)} m</b></div></div>`;
  mapa();
  $('#cap1').innerHTML = `<b>Figura 1.</b> Nível diário de ${esc(e.nome)} (${ref() ? 'm acima do NR' : 'régua, m'}). Toque no gráfico para ler os valores. Círculo e triângulo: modelos 1 e 2 do SipamHidro.`;
  $('#q1-c').textContent = 'A partir da última leitura (' + dmy(ISO(X.HOJE)) + ').';
  $('#q1 tbody').innerHTML = [0, 7, 15, 30, 60, 90].map((h) => { const i = h + atr; if (i > 100 || e.prev.f[i] == null) return ''; const v = vv(e, e.prev.f[i]), P = e.prev;  return `<tr class="${h > 30 ? 'hm' : ''}"><td>${h ? '+' + h + ' d' : 'atual'}<small class="hs"> ${dm(ISO(X.HOJE + h))}</small></td><td class="hm">${dmy(ISO(X.HOJE + h))}</td><td class="n${ref() && v < 0 ? ' neg' : ''}">${num(v)}</td></tr>`; }).join('');
  ['q1-n'].forEach((i) => { $('#' + i).textContent = 'Nível (' + uni() + ')'; });
  $('#q2-c').textContent = 'Toque na linha para o resumo. Ponto: vermelho, abaixo do NR ou cruzando em até 7 d; âmbar, atenção; verde, normal.';
  const ord = { bad: 0, warn: 1, ok: 2 };
  $('#q2 tbody').innerHTML = [...X.list].sort((a, b) => (a.r.atraso > 45) - (b.r.atraso > 45) || ord[a.r.s.c] - ord[b.r.s.c] || (a.r.L0 - a.nr) - (b.r.L0 - b.nr)).map((s) => { const q = s.r, n = (v) => `<td class="n${ref() && vv(s, v) < 0 ? ' neg' : ''}">${num(vv(s, v))}</td>`; return `<tr data-id="${s.id}" class="${s.id === st.est ? 'sel' : ''}"><td><i class="dot ${q.s.c}" title="${esc(q.s.t)}"></i>${esc(s.nome)}</td><td class="hm"><span class="pill ${q.s.c}">${esc(q.s.t)}</span></td>${n(q.L0)}<td class="n">${q.z == null ? '—' : `<span class="zc" style="background:${zcor(q.zk)}" title="${esc(q.cond)}">${sg(q.z, 1)}</span>`}</td><td class="n hm">${sg(q.d1, 0)}</td><td class="n">${sg(q.d7, 0)}</td><td class="n hm">${sg(q.taxa, 1)}</td>${n(q.f7)}${n(q.f15).replace('<td class="n', '<td class="hm n')}${n(q.f30)}${n(q.min).replace('<td class="n', '<td class="hm n')}</tr>`; }).join('');
  $$('#q2 tbody tr').forEach((tr) => tr.addEventListener('click', () => sheetEstacao(tr.dataset.id)));
  subtab(); cmpSip(); controles(); if (st.tab === 'prev') grafico(); if (document.body.classList.contains('ap')) apBarra();
}

// ---------- comparação com SipamHidro (muda com a janela) ----------
function cmpSip() {
  const e = E(), r = e.r, o = off(e), u = uni(), h = st.jan === '365' ? null : (st.jan === '180' ? 91 : +st.jan / 2), HOJE = X.HOJE;
  const fim = h == null ? Date.UTC(X.cur, 11, 31) / DAY : HOJE + h, rows = [], tx = [];
  const s15 = D.sipam.var15.find((s) => s.codigo_ana && s.codigo_ana === e.ana);
  const cmp = []; for (const z of X.ativas) { const s = D.sipam.var15.find((q) => q.codigo_ana && q.codigo_ana === z.ana); if (s && z.r.d15 != null) cmp.push([z.r.d15, s.var15_cm]); }
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
  $('#cs-n').textContent = u + '. Dif. = painel − SipamHidro (modelo 2 nos meses).';
}

// ---------- diagnóstico ----------
function diag() {
  const R = X.ativas, u = uni(), k = (e, v) => num(vv(e, v));
  $('#dg-t').textContent = 'Diagnóstico e prognóstico de nível · ' + dmy(D.hoje);
  $('#dg-c').textContent = 'Níveis em ' + u + '; cm/d = taxa de 7 d; Mín. = menor nível previsto em 100 d.';
  const neg = R.filter((e) => e.r.L0 - e.nr < 0), baixo = R.filter((e) => e.r.L0 - e.nr >= 0 && e.r.L0 - e.nr < 1), vaz = R.filter((e) => e.r.taxa < 0), mm = [...R].sort((a, b) => (a.r.min - a.nr) - (b.r.min - b.nr))[0];
  const cr = R.filter((e) => e.r.cruza), ord = { bad: 0, warn: 1, ok: 2 }, rk = [...R].sort((x, y) => ord[x.r.s.c] - ord[y.r.s.c] || (x.r.L0 - x.nr) - (y.r.L0 - y.nr));
  const tl = (v, l, s) => `<div class="kt"><b>${v}</b><span>${l}</span>${s ? '<small>' + s + '</small>' : ''}</div>`;
  $('#dg-sint').innerHTML = `<div class="kts">${tl(vaz.length + '/' + R.length, 'em vazante', 'média ' + sg(vaz.length ? mean(vaz.map((e) => e.r.taxa)) : 0, 1) + ' cm/d')}${tl(neg.length, 'abaixo do NR', baixo.length ? baixo.length + ' a menos de 1 m' : 'nenhuma a menos de 1 m')}${tl(cr.length + '/' + R.length, 'cruzam o NR em 100 d', cr.length ? 'primeira: ' + esc(cr.sort((x, y) => x.r.cruza.localeCompare(y.r.cruza))[0].nome) + ' ' + dm(cr[0].r.cruza) : '')}${tl(k(mm, mm.r.min) + ' m', 'menor nível previsto', esc(mm.nome) + ', ' + dm(mm.r.minData))}</div>
    <div class="tw"><table class="click" id="t-sint"><thead><tr><th>Estação</th><th class="n">Nível</th><th class="n">Δ 7 d</th><th class="n hm">cm/d</th><th class="n">Cruza NR</th><th class="n">Mín.</th></tr></thead><tbody>${rk.map((e) => { const q = e.r; return `<tr data-id="${e.id}"><td><i class="dot ${q.s.c}"></i>${esc(e.nome)}<small class="mut hm"> ${esc(q.s.t)}</small></td><td class="n${ref() && q.L0 - e.nr < 0 ? ' neg' : ''}">${k(e, q.L0)}</td><td class="n">${sg(q.d7, 0)}</td><td class="n hm">${sg(q.taxa, 1)}</td><td class="n">${q.cruza ? dm(q.cruza) : '—'}</td><td class="n">${k(e, q.min)}<small class="mut hm"> ${dm(q.minData)}</small></td></tr>`; }).join('')}</tbody></table></div>`;
  $$('#t-sint tbody tr').forEach((tr) => tr.addEventListener('click', () => sheetEstacao(tr.dataset.id)));
  const host = $('#dg-rios'); host.innerHTML = '';
  const rios = [...new Set(R.map((e) => e.rio))];
  rios.forEach((rio, ri) => { const es = R.filter((e) => e.rio === rio); 
    es.forEach((e, si) => { const r = e.r, sf = (v) => (v == null ? '—' : k(e, v)), c15 = D.sipam.var15.find((s) => s.codigo_ana && s.codigo_ana === e.ana), prog = D.sipam.prog.filter((p) => p.estacao === e.nome);
      const rows = [['Nível em ' + dm(r.data), k(e, r.L0) + ' m'], ['Taxa de 7 d', sg(r.taxa, 1) + ' cm/d'], ['Previsão em ' + dm(r.dataF[0]), sf(r.f7) + ' m'], ['Previsão em ' + dm(r.dataF[2]), sf(r.f30) + ' m'], ['Mínimo previsto', k(e, r.min) + ' m em ' + dm(r.minData) + (r.minBorda ? ' (fim do horizonte)' : '')], ['Cruza o NR', r.cruza ? dm(r.cruza) : 'não prevista']];
      if (c15) rows.push(['SipamHidro, 15 d', sg(c15.var15_cm, 0) + ' cm <small>(dif. ' + sg(r.d15 - c15.var15_cm, 0) + ')</small>']);
      if (prog.length) rows.push(['SipamHidro, modelo 2', prog.map((p) => MES[+p.mes.slice(5) - 1].toLowerCase() + ' ' + (p.modelo2_cm == null ? '—' : num(p.modelo2_cm / 100 - off(e)))).join(' · ')]);
      const art = document.createElement('article'); art.className = 'est';
      art.innerHTML = `<details><summary><b>${esc(e.nome)}</b><small class="rio-s">${esc(e.rio.replace('Rio ', ''))}</small><span class="pill ${r.s.c}">${esc(r.s.t)}</span><small>${k(e, r.L0)} m · ${sg(r.taxa, 1)} cm/d</small></summary>
        <figure class="jf"><div class="mini"></div><figcaption><b>Figura 2.${ri + 1}.${si + 1}.</b> Últimos e próximos 15 d (${u}).</figcaption></figure>
        <table class="jt"><tbody>${rows.map(([x, y]) => `<tr><th>${esc(x)}</th><td>${y}</td></tr>`).join('')}</tbody></table><p class="cap"><button class="lk" type="button" data-det>Detalhes de ${esc(e.nome)}</button></p></details>`;
      const dt = $('details', art); dt.addEventListener('toggle', () => { const m = $('.mini', art); if (dt.open && !m.firstChild) m.append(miniFig(e)); }); $('[data-det]', art).onclick = () => sheetEstacao(e.id); host.append(art); }); });
  $('#dg-h3').textContent = '3. Correlação com o boletim SipamHidro (' + dmy(D.sipam.boletim) + ')';
  $('#dg-cc').textContent = 'Quadro B em ' + u + '; painel = mínima do mês (observado + previsto).';
  const cmp = []; for (const e of R) { const s = D.sipam.var15.find((x) => x.codigo_ana && x.codigo_ana === e.ana); if (s && e.r.d15 != null) cmp.push({ e, p: e.r.d15, s: s.var15_cm }); }
  $('#t-c15 tbody').innerHTML = cmp.map((c) => `<tr><td>${esc(c.e.nome)}</td><td class="n">${sg(c.p, 0)}</td><td class="n">${sg(c.s, 0)}</td><td class="n">${sg(c.p - c.s, 0)}</td></tr>`).join('');
  let rr = null; if (cmp.length > 2) { const mx = mean(cmp.map((c) => c.p)), my = mean(cmp.map((c) => c.s)); rr = cmp.reduce((a, c) => a + (c.p - mx) * (c.s - my), 0) / Math.sqrt(cmp.reduce((a, c) => a + (c.p - mx) ** 2, 0) * cmp.reduce((a, c) => a + (c.s - my) ** 2, 0)); }
  $('#dg-r').textContent = cmp.length ? `n = ${cmp.length} estações comuns; r = ${num(rr, 3)}; diferença média ${sg(mean(cmp.map((c) => c.p - c.s)), 1)} cm (painel − boletim).` : '';
  const mes = [];
  for (const p of D.sipam.prog) { const e = R.find((x) => x.nome === p.estacao); if (!e) continue; const [ano, mm2] = p.mes.split('-').map(Number), t0 = e.r.t0, v = []; e.m.forEach((val, f) => { const d = new Date(f * DAY); if (d.getUTCFullYear() === ano && d.getUTCMonth() + 1 === mm2) v.push(val); }); for (let h = 1; h <= 100; h++) { const d = new Date((t0 + h) * DAY); if (d.getUTCFullYear() === ano && d.getUTCMonth() + 1 === mm2 && e.prev.f[h] != null) v.push(e.prev.f[h]); } mes.push({ e, p, mn: v.length ? Math.min(...v) : null }); }
  $('#t-cm tbody').innerHTML = mes.map(({ e, p, mn }) => `<tr><td>${esc(e.nome)}</td><td>${MES[+p.mes.slice(5) - 1]}/${p.mes.slice(0, 4)}</td><td class="n hm">${p.modelo1_cm == null ? '—' : num(p.modelo1_cm / 100 - off(e))}</td><td class="n">${p.modelo2_cm == null ? '—' : num(p.modelo2_cm / 100 - off(e))}</td><td class="n">${mn == null ? '—' : num(mn - off(e))}</td></tr>`).join('');
  const mont = ['Tabatinga', 'Fonte Boa', 'Beruri', 'Manacapuru / Manaquiri', 'Moura', 'Cucuí', 'Itaituba'].map((n) => { const s = D.sipam.var15.find((x) => x.estacao === n); return s ? n + ' ' + sg(s.var15_cm, 0) + ' cm' : null; }).filter(Boolean);
  $('#dg-mont').textContent = 'Estações a montante no boletim (variação em 15 d): ' + mont.join('; ') + '.';
  const ult = mes.map((x) => x.p.mes).sort().pop(), dif = mes.filter((x) => x.p.mes === ult && x.p.modelo2_cm != null && x.mn != null).map((x) => x.e.nome + ' (' + sg(x.p.modelo2_cm / 100 - x.mn, 1) + ' m)');
  $('#dg-cons').innerHTML = `<li>Em ${ult ? MES[+ult.slice(5) - 1].toLowerCase() : '—'}, modelo 2 − painel (mínima): ${esc(dif.join('; '))}. O painel não usa dados de montante; o boletim sim.</li><li>A anomalia (σ) usa a média do dia nos 30 anos mais recentes com dado; o boletim usa série histórica própria, então as classes podem diferir.</li>`;
}

// ---------- referência vertical ----------
let rfLog = LS.get('log', []);
function rfReset() { const e = E(); $('#rf-est').value = e.id; $('#rf-nr').value = e.nr; $('#rf-leit').value = e.r.L0; rfCalc('leit'); }
function rfCalc(from) {
  const nr = parseFloat($('#rf-nr').value), l = parseFloat($('#rf-leit').value), c = parseFloat($('#rf-col').value);
  if (from === 'leit' || from === 'nr') { if (isFinite(l) && isFinite(nr)) $('#rf-col').value = (Math.round((l - nr) * 100) / 100).toFixed(2); } else if (from === 'col' && isFinite(c) && isFinite(nr)) $('#rf-leit').value = (Math.round((c + nr) * 100) / 100).toFixed(2);
  const col = parseFloat($('#rf-col').value), s = parseFloat($('#rf-sond').value), cal = parseFloat($('#rf-cal').value), pr = s + col, sq = parseFloat($('#rf-sq').value), uk = col + s - cal - (isFinite(sq) ? sq : 0);
  $('#rs-col').textContent = isFinite(col) ? sg(col) + ' m' : '—'; $('#rs-prof').textContent = isFinite(pr) ? num(pr) + ' m' : '—'; const u = $('#rs-ukc'); u.textContent = isFinite(uk) ? sg(uk) + ' m' : '—'; u.style.color = uk < 0 ? 'var(--bad)' : ''; $('#rs-eq').innerHTML = [[col, 'coluna'], [s, 'sondagem'], [-cal, 'calado'], [-(isFinite(sq) ? sq : 0), 'squat']].map(([v, t]) => `<span><b>${isFinite(v) ? sg(v) : '—'}</b> ${t}</span>`).join('') + `<span class="eq">= <b>${isFinite(uk) ? sg(uk) : '—'} m</b></span>`;
}
['leit', 'nr', 'col'].forEach((k) => $('#rf-' + k).addEventListener('input', () => rfCalc(k))); ['sond', 'cal', 'sq'].forEach((k) => $('#rf-' + k).addEventListener('input', () => rfCalc('x')));
$('#rf-est').addEventListener('change', (ev) => { st.est = ev.target.value; LS.set('est', st.est); rfReset(); });
$('#rf-ult').addEventListener('click', () => { $('#rf-leit').value = E().r.L0; rfCalc('leit'); });
$('#rf-nrad').addEventListener('click', () => { $('#rf-nr').value = E().nr; rfCalc('nr'); });
function rfTabela() { $('#rf-log tbody').innerHTML = rfLog.length ? rfLog.map((r0) => { const r = r0.length === 9 ? [...r0.slice(0, 8), '—', r0[8]] : r0; return r; }).map((r) => `<tr>${r.map((c, i) => `<td class="${i > 1 ? 'n' : ''}${[2, 3, 6, 8].includes(i) ? ' hm' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('') : '<tr><td colspan="10">Nenhum registro.</td></tr>'; }
$('#rf-reg').addEventListener('click', () => { const v = (i) => parseFloat($('#' + i).value); if (!isFinite(v('rf-col'))) return; const col = v('rf-col'), pr = v('rf-sond') + col; rfLog.unshift([new Date().toLocaleString('pt-BR'), E().nome, num(v('rf-leit')), num(v('rf-nr')), sg(col), num(v('rf-sond')), num(pr), num(v('rf-cal')), num(isFinite(v('rf-sq')) ? v('rf-sq') : 0), sg(col + v('rf-sond') - v('rf-cal') - (isFinite(v('rf-sq')) ? v('rf-sq') : 0))]); rfLog = rfLog.slice(0, 300); LS.set('log', rfLog); rfTabela(); toast('Conversão registrada neste aparelho.'); });
$('#rf-clear').addEventListener('click', () => { if (rfLog.length && confirm('Apagar todos os registros deste aparelho?')) { rfLog = []; LS.set('log', rfLog); rfTabela(); } });
$('#rf-copy').addEventListener('click', () => copiar(['data_hora;estacao;leitura_m;nr_m;coluna_m;sondagem_m;profundidade_m;calado_m;squat_m;faq_m', ...rfLog.map((r) => (r.length === 9 ? [...r.slice(0, 8), '', r[8]] : r).join(';'))].join('\n').replace(/−/g, '-'), 'Registros copiados (CSV).'));
function refPag() {
  const sel = $('#rf-est'); if (!sel.options.length) sel.innerHTML = X.list.map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join(''); sel.value = st.est; if (!$('#rf-nr').value) rfReset();
  $('#t-nr tbody').innerHTML = X.list.map((e) => { const f = (v) => num(v, 3).replace(/,?0$/, ''); return `<tr><td>${esc(e.nome)}</td><td class="hm">${esc(e.carta)}</td><td class="hm">${esc(e.rn)}</td><td class="n hm">${num(e.nr_rn_cm)}</td><td class="n hm">${num(e.zero_rn_cm)}</td><td class="n hm">${f(e.nr_f43)}</td><td class="n" style="font-weight:600">${f(e.nr)}</td><td class="hm">${esc(e.fonte_nr)}${Math.abs(e.nr - e.nr_f43) > 0.0005 ? ' (' + sg(e.nr - e.nr_f43) + ' m vs. F-43)' : ''}</td><td><a href="files/${fileOf(e.nome)}" target="_blank" rel="noopener">F-43 (PDF)</a></td></tr>`; }).join(''); rfTabela();
}

// ---------- ciência e dados ----------
function csvSerie() {
  const ds = new Set(); X.list.forEach((e) => e.m.forEach((v, f) => ds.add(f))); const dias = [...ds].sort((a, b) => a - b);
  const h = ['data', ...X.list.flatMap((e) => [e.nome + '_regua_m', e.nome + '_acima_NR_m'])];
  return [h.join(';'), ...dias.map((f) => [ISO(f), ...X.list.flatMap((e) => { const v = e.m.get(f); return v === undefined ? ['', ''] : [num(v), num(v - e.nr)]; })].join(';'))].join('\n');
}
$('#b-csv-s').addEventListener('click', () => baixar('serie_integrada_ZP1.csv', csvSerie()));
function cie() {
  $('#cie-d').textContent = 'Fontes: leituras de régua (Setor de Hidrografia) e cotas do ANA Hidroweb, no mesmo zero de régua. Sem dado = NaN. Dados até ' + dmy(D.hoje) + '.';
  $('#t-dados tbody').innerHTML = X.list.map((e) => { const ks = [...e.m.keys()], a = Math.min(...ks), b = Math.max(...ks); return `<tr><td>${esc(e.nome)}</td><td>${dmy(ISO(a))}</td><td>${dmy(ISO(b))}</td><td class="n">${ks.length}</td><td class="n hm">${num((ks.length / (b - a + 1)) * 100, 1)}%</td><td class="n hm">${D.qc.filter((q) => q.estacao === e.nome).length}</td><td class="n hm">${e.prev.anos_clim}</td></tr>`; }).join('');
  $('#t-val tbody').innerHTML = X.list.map((e) => { const c = (h) => { const s = e.prev.skill.find((x) => x.h === h); return `<td class="n${h === 15 || h === 60 || h === 90 ? ' hm' : ''}">${s && s.metodo != null ? num(s.metodo) + ' (' + num(s.persistencia) + ')' : '—'}</td>`; }; return `<tr><td>${esc(e.nome)}</td><td class="n hm">${e.prev.n_origens}</td>${c(7)}${c(15)}${c(30)}${c(60)}${c(90)}</tr>`; }).join('');
  $('#qc-sum').textContent = 'Leituras descartadas pelo controle de qualidade (' + D.qc.length + ')';
  $('#t-qc tbody').innerHTML = [...D.qc].sort((a, b) => a.estacao.localeCompare(b.estacao) || a.data.localeCompare(b.data)).map((r) => `<tr><td>${esc(r.estacao)}</td><td>${r.data}</td><td class="n">${num(r.regua)}</td><td class="n hm">${num(r.mediana_local)}</td><td class="n hm">${sg(r.desvio_m)}</td><td class="hm">${esc(r.criterio || 'pico local')}</td></tr>`).join('');
  const ds = $('#dl-est'); if (!ds.options.length) { ds.innerHTML = X.list.map((e) => `<option value="${e.id}">${esc(e.nome)}</option>`).join(''); ds.value = st.est; ds.onchange = leit; $('#dl-det').ontoggle = leit; $('#dl-copy').onclick = () => { const e = X.list.find((z) => z.id === ds.value), ks = [...e.m.keys()].sort((x, y) => x - y); copiar(['data;regua_m;acima_nr_m', ...ks.map((f) => ISO(f) + ';' + e.m.get(f).toFixed(2) + ';' + (e.m.get(f) - e.nr).toFixed(2))].join('\n'), 'Leituras de ' + e.nome + ' copiadas (CSV).'); }; }
  function leit() { if (!$('#dl-det').open) return; const e = X.list.find((z) => z.id === ds.value), ks = [...e.m.keys()].sort((x, y) => y - x); $('#dl-n').textContent = ks.length + ' dias · ' + dmy(ISO(ks[ks.length - 1])) + ' a ' + dmy(ISO(ks[0])); $('#dl-tab tbody').innerHTML = ks.map((f) => `<tr><td>${dmy(ISO(f))}</td><td class="n">${num(e.m.get(f))}</td><td class="n">${num(e.m.get(f) - e.nr)}</td></tr>`).join(''); }
  leit();
  
  if (ART) { $('#b-instalar').hidden = true; $('#b-csv-s').textContent = 'Copiar série integrada (CSV)'; $('#b-csv-g').textContent = 'Copiar dados do gráfico (CSV)'; }
  $('#b-app').onclick = () => { if (navigator.share) navigator.share({ title: 'Rios ZP-1', text: TEXTO_APP }).catch(() => {}); else copiar(TEXTO_APP, 'Texto e link copiados.'); }; $('#b-app-c').onclick = () => copiar(TEXTO_APP, 'Texto e link copiados.'); $('#b-app-w').href = 'https://wa.me/?text=' + encodeURIComponent(TEXTO_APP); $('#app-txt').textContent = TEXTO_APP;
  const g = new Date(D.gerado); $('#cie-u').textContent = 'Dados gerados em ' + g.toLocaleString('pt-BR') + '.';
}
$('#b-recarregar').addEventListener('click', async () => { try { const m = await carregar(false); redraw(); toast(m ? 'Dados novos carregados (' + dmy(D.hoje) + ').' : 'Você já está com a versão mais recente (' + dmy(D.hoje) + ').'); if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then((r) => r && r.update()); } catch (e) { toast('Sem conexão: usando os dados guardados.'); } });

// ---------- resumo do dia (histórias) ----------
function resumoDia() {
  if (!X) return; const R = X.ativas, u = ref() ? 'm acima do NR' : 'm na régua', c = (e, v) => num(vv(e, v)), raso = [...R].sort((a, b) => (a.r.L0 - a.nr) - (b.r.L0 - b.nr))[0], vaz = [...R].sort((a, b) => a.r.taxa - b.r.taxa)[0];
  const neg = R.filter((e) => e.r.L0 - e.nr < 0), cruz = R.filter((e) => e.r.cruza).sort((a, b) => a.r.cruza.localeCompare(b.r.cruza)), mm = [...R].sort((a, b) => (a.r.min - a.nr) - (b.r.min - b.nr))[0];
  const f7 = [...R].sort((a, b) => (a.r.f7 - a.nr) - (b.r.f7 - b.nr)).slice(0, 3).map((e) => esc(e.nome) + ' ' + c(e, e.r.f7)).join('; ');
  const linhas = [
    ['Em vazante', R.filter((e) => e.r.taxa < 0).length + ' de ' + R.length + ' estações; taxa média ' + num(mean(R.map((e) => e.r.taxa)), 1) + ' cm/d'],
    ['Menor coluna', esc(raso.nome) + ', ' + sg(raso.r.L0 - raso.nr) + ' m em relação ao NR' + (neg.length ? '. Abaixo do NR: ' + neg.map((e) => esc(e.nome)).join(', ') : '. Nenhuma abaixo do NR')],
    ['Maior vazante', esc(vaz.nome) + ', ' + sg(vaz.r.taxa, 1) + ' cm/d (' + sg(vaz.r.d15, 0) + ' cm em 15 d)'],
    ['Mais rasas em +7 d', f7 + ' (' + u + ')'],
    ['Cruzam o NR (100 d)', cruz.length ? cruz.slice(0, 5).map((e) => esc(e.nome) + ' ' + dm(e.r.cruza)).join('; ') : 'nenhuma'],
    ['Mínimo previsto', esc(mm.nome) + ', ' + sg(mm.r.min - mm.nr) + ' m em ' + dm(mm.r.minData)],
  ];
  abrirSheet('Resumo do dia · ' + dmy(D.hoje), `<p class="cap">Estações com leitura recente. Níveis em ${u}.</p><ul class="rs">${linhas.map(([k, v]) => `<li><b>${k}</b><span>${v}</span></li>`).join('')}</ul>`);
}

// ---------- busca ----------
let bItens = [], bSel = 0;
function abrirBusca() { if (!X) return; const d = $('#dlg-busca'); $('#bq').value = ''; buscaLista(''); d.showModal(); $('#bq').focus(); }
function buscaLista(q) {
  const n = norm(q), acoes = [['Resumo do dia', 'Ação', () => resumoDia()], ['Alternar referencial (NR / régua)', 'Ação', () => { st.ref = ref() ? 'regua' : 'nr'; LS.set('ref', st.ref); redraw(); }], ['Alternar modo escuro', 'Ação', () => $('#b-tema').click()], ['Janela 30 dias', 'Gráfico', () => { st.jan = '30'; LS.set('jan', '30'); show('prev'); }], ['Janela 90 dias', 'Gráfico', () => { st.jan = '90'; LS.set('jan', '90'); show('prev'); }], ['Janela ano todo', 'Gráfico', () => { st.jan = '365'; LS.set('jan', '365'); show('prev'); }], ['Exportar série integrada (CSV)', 'Ação', () => $('#b-csv-s').click()], ['Como instalar o app', 'Ação', () => abrirInstalar()]];
  const abas = [['Previsão', 'prev'], ['Diagnóstico', 'diag'], ['Calcular FAQ', 'ref'], ['Info', 'cie']].map(([t, v]) => [t, 'Seção', () => show(v)]);
  const ests = X.list.map((e) => [e.nome + ' · ' + e.rio, 'Estação', () => { st.est = e.id; LS.set('est', e.id); show('prev'); }]);
  bItens = [...ests, ...abas, ...acoes].filter(([t]) => !n || norm(t).includes(n)).slice(0, 14); bSel = 0;
  $('#bl').innerHTML = bItens.map(([t, k], i) => `<li role="option" data-i="${i}" aria-selected="${i === 0}"><span>${esc(t)}</span><small>${k}</small></li>`).join('') || '<li><span>Nada encontrado</span></li>';
}
const buscaIr = (i) => { const it = bItens[i]; if (!it) return; $('#dlg-busca').close(); it[2](); };
$('#bq').addEventListener('input', (e) => buscaLista(e.target.value));
$('#bq').addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); bSel = (bSel + (e.key === 'ArrowDown' ? 1 : -1) + bItens.length) % bItens.length; $$('#bl li').forEach((li, i) => li.setAttribute('aria-selected', String(i === bSel))); } else if (e.key === 'Enter') buscaIr(bSel); });
$('#bl').addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) buscaIr(+li.dataset.i); });
$('#dlg-busca').addEventListener('click', (e) => { if (e.target.id === 'dlg-busca') e.target.close(); });
addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); abrirBusca(); } else if (e.key === 'Escape') { if (!$('#ovl').hidden) fecharSheet(); } else if (X && st.tab === 'prev' && !/INPUT|SELECT|TEXTAREA/.test((document.activeElement || {}).tagName || '') && !document.querySelector('dialog[open]') && $('#ovl').hidden) { if (e.key === 'ArrowRight') trocaEst(1); if (e.key === 'ArrowLeft') trocaEst(-1); } });
let tx0 = null; $('#hero').addEventListener('touchstart', (e) => { tx0 = [e.touches[0].clientX, e.touches[0].clientY]; }, { passive: true }); $('#hero').addEventListener('touchend', (e) => { if (!tx0) return; const dx = e.changedTouches[0].clientX - tx0[0], dy = e.changedTouches[0].clientY - tx0[1]; tx0 = null; if (Math.abs(dx) > 70 && Math.abs(dy) < 40) trocaEst(dx < 0 ? 1 : -1); }, { passive: true });

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
function banner() { if (ART || standalone() || Date.now() - LS.get('ban-x', 0) < 14 * DAY) return; const p = plataforma(); $('#ban-t').textContent = p === 'ios' ? 'Para usar como app: Safari → Compartilhar → Adicionar à Tela de Início.' : p === 'android' ? 'Para usar como app: Chrome → menu ⋮ → Instalar app.' : p === 'app' ? 'Abra este link no Chrome ou no Safari para instalar o app.' : 'Este site pode ser instalado como app (PWA).'; if (new URLSearchParams(location.search).has('instalar')) abrirInstalar(); }

// ---------- ciclo ----------
function redraw() {
  if (!X) return; const safe = (f) => { try { f(); } catch (e) { console.error(e); } };
  $$('#seg-ref button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.r === st.ref)));
  $$('.view').forEach((s) => { s.hidden = s.id !== 'v-' + st.tab; });
  $$('#tabs button,#bnav button').forEach((b) => { if (b.dataset.v === st.tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current'); });
  safe(prever); if (st.tab === 'ser') safe(serie); if (st.tab === 'diag') safe(diag); if (st.tab === 'ref') safe(refPag); if (st.tab === 'cie') safe(cie);
}
let lastW = 0; if ('ResizeObserver' in window) new ResizeObserver(([en]) => { const w = Math.round(en.contentRect.width); if (w && w !== lastW) { lastW = w; if (X && st.tab === 'prev') safe2(grafico); } }).observe($('#chart'));
let rz; addEventListener('resize', () => { clearTimeout(rz); rz = setTimeout(() => { if (X && st.tab === 'prev') safe2(grafico); if (X && st.tab === 'ser') safe2(serie); }, 150); });
const safe2 = (f) => { try { f(); } catch (e) { console.error(e); } };
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && D && Date.now() - lastCheck > 30 * 60 * 1000) { lastCheck = Date.now(); carregar(true).then((m) => m && redraw()).catch(() => {}); } });
let lastCheck = Date.now();
// ---------- contador de visitas e usuários on-line (Abacus; só números, sem dados pessoais) ----------
function contador() {
  if (ART) return;
  const q = new URLSearchParams(location.search); if (q.has('dono')) LS.set('dono', q.get('dono') !== '0');
  const dono = LS.get('dono', false) || /^(localhost|127\.|\[::1\])/.test(location.hostname) || location.protocol === 'file:';
  const AB = 'https://abacus.jasoncameron.dev', NS = 'rios-zp1-unipilot', el = $('#rod-c');
  const get = (k) => fetch(`${AB}/get/${NS}/${k}`).then((r) => (r.ok ? r.json() : { value: 0 })).then((j) => j.value || 0).catch(() => null);
  const hit = (k) => fetch(`${AB}/hit/${NS}/${k}`).then((r) => r.json()).then((j) => j.value).catch(() => null);
  const min = (d) => new Date(Date.now() - d * 60000).toISOString().slice(0, 16).replace(/[-:T]/g, '');
  let ultimo = '';
  const mostrar = async () => { const [v, a, b] = await Promise.all([get('visitas'), get('on-' + min(0)), get('on-' + min(1))]); if (v == null) return; el.textContent = 'Visitas: ' + v + ' · Online agora: ' + Math.max(a || 0, b || 0, dono ? 0 : 1) + (dono ? ' · seu acesso não conta' : ''); el.hidden = false; };
  const ping = async () => { if (!dono && document.visibilityState === 'visible') { const k = 'on-' + min(0); if (k !== ultimo) { ultimo = k; await hit(k); } } mostrar(); };
  (async () => { if (!dono) { let novo = false; try { novo = !sessionStorage.getItem('zp1-sv'); sessionStorage.setItem('zp1-sv', '1'); } catch (e) { novo = true; } if (novo) await hit('visitas'); } ping(); setInterval(ping, 60000); })();
}
// ---------- séries históricas (respostas rápidas sobre a série completa) ----------
const SER = { jan: LS.get('ser-jan', 'all') };
const yOf = (f) => new Date(f * DAY).getUTCFullYear();
function serBase(e) {
  const key = e.id + D.gerado; if (serBase.k === key) return serBase.v;
  const an = new Map(), all = []; let mx = null, mn = null;
  for (const [f, v] of e.m) {
    const y = yOf(f); let a = an.get(y); if (!a) an.set(y, (a = { n: 0, max: -1e9, min: 1e9, fmax: 0, fmin: 0 }));
    a.n++; if (v > a.max) { a.max = v; a.fmax = f; } if (v < a.min) { a.min = v; a.fmin = f; } all.push(v);
    if (!mx || v > mx.v) mx = { v, f }; if (!mn || v < mn.v) mn = { v, f };
  }
  all.sort((p, q) => p - q);
  serBase.k = key; return (serBase.v = { an, all, mx, mn });
}
// valor do ano y na mesma data de t0 (+ off dias): média de ±2 d
function emData(e, y, t0, off) { const d = new Date(t0 * DAY), b = Date.UTC(y, d.getUTCMonth(), Math.min(d.getUTCDate(), d.getUTCMonth() === 1 ? 28 : 31)) / DAY + off; let a = 0, n = 0; for (let j = -2; j <= 2; j++) { const v = e.m.get(b + j); if (v !== undefined) { a += v; n++; } } return n >= 2 ? a / n : null; }
const passoAnos = (span, W) => [1, 2, 5, 10, 20, 25, 50].find((p) => span / p <= Math.max(3, W / 64)) || 50;
function fig(box, o) {
  const W = Math.max(300, box.clientWidth), Ht = o.h || Math.round(Math.min(340, Math.max(W < 520 ? 165 : 230, W * (W < 520 ? 0.5 : 0.4)))), mg = { t: 12, r: 14, b: o.xl ? 48 : 30, l: W < 520 ? 44 : 52 };
  const tk = ticks(o.lo, o.hi, 6), lo = Math.min(o.lo, tk.t[0]), hi = Math.max(o.hi, tk.t[tk.t.length - 1]), xs = lin(o.x0, o.x1, mg.l, W - mg.r), yl = lin(lo, hi, Ht - mg.b, mg.t), xa = Ht - mg.b;
  const svg = sv('svg', { width: '100%', viewBox: `0 0 ${W} ${Ht}`, height: Ht, role: 'img', 'aria-label': o.aria });
  for (const v of tk.t) { svg.append(sv('line', { x1: mg.l, x2: W - mg.r, y1: yl(v), y2: yl(v), stroke: 'var(--grid)', 'stroke-width': 0.8 }), sv('line', { x1: mg.l - 4, x2: mg.l, y1: yl(v), y2: yl(v), stroke: 'var(--ink)', 'stroke-width': 0.9 }), sv('text', { x: mg.l - 7, y: yl(v) + 4, 'text-anchor': 'end' }, num(v, tk.s < 1 ? 1 : 0))); }
  svg.append(sv('line', { x1: mg.l, x2: W - mg.r, y1: xa, y2: xa, stroke: 'var(--ink)', 'stroke-width': 0.9 }), sv('line', { x1: mg.l, x2: mg.l, y1: mg.t, y2: xa, stroke: 'var(--ink)', 'stroke-width': 0.9 }));
  for (const t of o.xt) if (t.v >= o.x0 && t.v <= o.x1) svg.append(sv('line', { x1: xs(t.v), x2: xs(t.v), y1: xa, y2: xa + 4, stroke: 'var(--ink)', 'stroke-width': 0.9 }), sv('text', { x: xs(t.v), y: xa + 17, 'text-anchor': 'middle' }, t.t));
  svg.append(sv('text', { transform: `translate(11 ${(mg.t + xa) / 2}) rotate(-90)`, 'text-anchor': 'middle' }, o.yl));
  if (o.xl) svg.append(sv('text', { x: (mg.l + W - mg.r) / 2, y: Ht - 3, 'text-anchor': 'middle' }, o.xl));
  o.draw(svg, xs, yl, { mg, W, Ht, xa });
  const tip = document.createElement('div'); tip.className = 'tip'; const cross = sv('line', { y1: mg.t, y2: xa, stroke: 'var(--mut)', opacity: 0 }), dot = sv('circle', { r: 3.6, fill: 'var(--ink)', stroke: 'var(--panel)', opacity: 0 });
  svg.append(cross, dot);
  const ov = sv('rect', { x: mg.l, y: mg.t, width: W - mg.l - mg.r, height: xa - mg.t, fill: 'transparent', style: 'cursor:crosshair' });
  const mover = (ev) => { const rc = svg.getBoundingClientRect(), px = (ev.clientX - rc.left) * (W / rc.width), q = o.tip(xs.inv(px)); if (!q) return; const x = xs(q.f); cross.setAttribute('x1', x); cross.setAttribute('x2', x); cross.setAttribute('opacity', 1); if (q.v != null) { dot.setAttribute('cx', x); dot.setAttribute('cy', yl(q.v)); dot.setAttribute('opacity', 1); } else dot.setAttribute('opacity', 0); tip.innerHTML = q.html; tip.style.opacity = 1; const tw = tip.offsetWidth; tip.style.left = Math.max(4, Math.min(W - tw - 4, x + 12 + tw > W ? x - tw - 12 : x + 12)) + 'px'; tip.style.top = (mg.t + 6) + 'px'; };
  ov.addEventListener('pointermove', mover); ov.addEventListener('pointerdown', mover); ov.addEventListener('pointerleave', () => { tip.style.opacity = 0; cross.setAttribute('opacity', 0); dot.setAttribute('opacity', 0); });
  svg.append(ov); box.replaceChildren(svg, tip);
}
function serie() {
  const e = E(), B = serBase(e), P = e.prev, r = e.r, t0 = dnum(P.origem), cur = yOf(t0), u = ref() ? 'm acima do NR' : 'm na régua', c = (v) => num(vv(e, v)), cs = (v) => sg(vv(e, v));
  const sel = $('#ser-est'); if (!sel.options.length || sel.dataset.n !== String(X.list.length)) { sel.innerHTML = X.list.map((z) => `<option value="${z.id}">${esc(z.nome)} · ${esc(z.rio)}</option>`).join(''); sel.dataset.n = String(X.list.length); } sel.value = e.id;
  $('#ser-c').textContent = e.nome + ' · ' + e.rio + ': ' + dmy(ISO(Math.min(...e.m.keys()))) + ' a ' + dmy(ISO(Math.max(...e.m.keys()))) + ' · ' + u + '.';
  $$('#seg-ser button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.j === SER.jan)));
  // mesma data nos anos anteriores
  const ys = []; for (const y of B.an.keys()) if (y < cur) { const v = emData(e, y, t0, 0); if (v != null) ys.push({ y, v }); }
  const L0 = P.L0, n = ys.length, menor = ys.filter((z) => z.v < L0).length, pct = n ? Math.round(((menor + 0.5 * ys.filter((z) => z.v === L0).length) / n) * 100) : null;
  const dmin = n ? ys.reduce((a, b) => (b.v < a.v ? b : a)) : null, dmax = n ? ys.reduce((a, b) => (b.v > a.v ? b : a)) : null;
  $('#ser-kts').innerHTML = [
    { k: 'Posição', big: pct == null ? '—' : 'P' + pct, t: n ? (menor + 1) + 'º menor em ' + (n + 1) + ' anos' : 'sem base', s: 'Percentil entre os anos com dado na mesma data (±2 d).' },
    { k: 'Mín. na data', big: dmin ? c(dmin.v) + ' m' : '—', t: dmin ? 'em ' + dmin.y : '', s: 'Hoje: ' + c(L0) + ' m (' + uni() + ').' },
    { k: 'Máx. na data', big: dmax ? c(dmax.v) + ' m' : '—', t: dmax ? 'em ' + dmax.y : '', s: 'Amplitude: ' + (dmax ? num(dmax.v - dmin.v) + ' m' : '—') + '.' },
    { k: 'Anomalia', big: r.z == null ? '—' : sg(r.z, 1) + ' σ', t: r.cond, s: 'Média do dia: ' + (r.mu == null ? '—' : c(r.mu) + ' m') + '.' },
    { k: 'Máx. série', big: c(B.mx.v) + ' m', t: dmy(ISO(B.mx.f)), s: 'Série de ' + B.an.size + ' anos, ' + B.all.length.toLocaleString('pt-BR') + ' dias com dado.' },
    { k: 'Mín. série', big: c(B.mn.v) + ' m', t: dmy(ISO(B.mn.f)), s: 'Anos completos (≥ 330 d): ' + [...B.an.values()].filter((a) => a.n >= 330).length + '.' },
  ].map((k) => `<div class="kt" title="${esc(k.s)}"><small>${esc(k.k)}</small><b>${esc(k.big)}</b><span>${esc(k.t)}</span></div>`).join('');
  const nrv = ref() ? 0 : e.nr, nrDraw = (svg, xs, yl, g) => { if (nrv >= 0) { svg.append(sv('line', { x1: g.mg.l, x2: g.W - g.mg.r, y1: yl(nrv), y2: yl(nrv), stroke: 'var(--bad)', 'stroke-width': 1.2 }), sv('text', { x: g.mg.l + 4, y: yl(nrv) - 4, style: 'fill:var(--bad)' }, 'NR')); } };
  // Figura 1: série diária
  const f0 = Math.min(...e.m.keys()), f1 = Math.max(...e.m.keys()), yrs = SER.jan === 'all' ? 1e3 : +SER.jan, x0 = Math.max(f0, f1 - yrs * 365.25), x1 = f1;
  const pts = []; for (let f = Math.ceil(x0); f <= x1; f++) { const v = e.m.get(f); pts.push({ f, v: v === undefined ? null : v - off(e) }); }
  const W1 = Math.max(300, $('#ser-f1').clientWidth), bk = Math.max(1, Math.floor(pts.length / (W1 * 1.1))), dec = [];
  for (let i = 0; i < pts.length; i += bk) { let mi = null, ma = null; for (let j = i; j < Math.min(pts.length, i + bk); j++) { const p = pts[j]; if (p.v == null) continue; if (!mi || p.v < mi.v) mi = p; if (!ma || p.v > ma.v) ma = p; } if (!mi) { dec.push({ f: pts[i].f, v: null }); continue; } if (bk === 1) dec.push(mi); else if (mi.f <= ma.f) dec.push(mi, ma); else dec.push(ma, mi); }
  const seg = []; let prev = null; for (const p of dec) { if (p.v != null && prev != null && p.f - prev > 6 * Math.max(1, bk)) seg.push({ f: p.f, v: null }); seg.push(p); if (p.v != null) prev = p.f; }
  const vs = pts.filter((p) => p.v != null).map((p) => p.v), span = (x1 - x0) / 365.25, step = passoAnos(span, W1), xt1 = []; for (let y = Math.ceil(yOf(x0) / step) * step; y <= yOf(x1); y += step) xt1.push({ v: Date.UTC(y, 0, 1) / DAY, t: String(y) });
  if (span <= 3) { xt1.length = 0; for (let d = new Date(x0 * DAY), q = Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1); q / DAY <= x1; ) { const dd = new Date(q); xt1.push({ v: q / DAY, t: MES[dd.getUTCMonth()] + (dd.getUTCMonth() === 0 ? ' ' + dd.getUTCFullYear() : '') }); q = Date.UTC(dd.getUTCFullYear(), dd.getUTCMonth() + (span > 1.5 ? 3 : 1), 1); } }
  fig($('#ser-f1'), { x0, x1, lo: Math.min(...vs, nrv), hi: Math.max(...vs), xt: xt1, yl: ref() ? 'Nível acima do NR (m)' : 'Leitura da régua (m)', aria: 'Série diária de ' + e.nome,
    draw: (svg, xs, yl, g) => { nrDraw(svg, xs, yl, g); svg.append(sv('path', { d: pth(seg, xs, yl), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1, 'stroke-linejoin': 'round' })); const lp = pts.filter((p) => p.v != null).pop(); if (lp) svg.append(sv('circle', { cx: xs(lp.f), cy: yl(lp.v), r: 3.6, fill: 'var(--fc)', stroke: 'var(--panel)', 'stroke-width': 1.5 })); },
    tip: (xv) => { const f = Math.round(xv); let q = e.m.get(f), g = f; for (let k = 1; k <= 3 && q === undefined; k++) { q = e.m.get(f - k); g = f - k; if (q === undefined) { q = e.m.get(f + k); g = f + k; } } if (q === undefined) return { f, v: null, html: `<div class="h">${dmy(ISO(f))}</div><div class="n">sem dado (NaN)</div>` }; const cz = climAt(e, g), z = cz ? (q - cz[0]) / cz[1] : null; return { f: g, v: q - off(e), html: `<div class="h">${dmy(ISO(g))}</div><div class="r"><span>Nível</span><b>${num(q - off(e))}</b></div>` + (z != null ? `<div class="n"><i class="zs" style="background:${zcor(ZK(z))}"></i>${sg(z, 1)} σ · ${zcond(z)}</div>` : '') }; } });
  $('#ser-c1').innerHTML = '<b>Figura 1.</b> Nível diário (' + u + '). Vermelho: NR. Toque para ler.';
  // Figura 2: máximas e mínimas anuais
  const ya = [...B.an.entries()].sort((a, b) => a[0] - b[0]), full = (a) => a.n >= 330, yv = ya.flatMap(([, a]) => [a.max - off(e), a.min - off(e)]);
  const byY = new Map(ya); const y0 = ya[0][0], y1 = ya[ya.length - 1][0], sp2 = y1 - y0, st2 = passoAnos(sp2, Math.max(300, $('#ser-f2').clientWidth)), xt2 = []; for (let y = Math.ceil(y0 / st2) * st2; y <= y1; y += st2) xt2.push({ v: y, t: String(y) });
  fig($('#ser-f2'), { x0: y0 - 0.5, x1: y1 + 0.5, lo: Math.min(...yv, nrv), hi: Math.max(...yv), xt: xt2, yl: ref() ? 'Nível acima do NR (m)' : 'Leitura da régua (m)', aria: 'Máximas e mínimas anuais de ' + e.nome,
    draw: (svg, xs, yl, g) => { nrDraw(svg, xs, yl, g); for (const k of ['max', 'min']) { const q = ya.filter(([, a]) => full(a)).map(([y, a]) => ({ f: y, v: a[k] - off(e) })); svg.append(sv('path', { d: pth(q, xs, yl), fill: 'none', stroke: k === 'max' ? 'var(--trend)' : 'var(--fc)', 'stroke-width': 1.2 })); for (const [y, a] of ya) svg.append(sv('circle', { cx: xs(y), cy: yl(a[k] - off(e)), r: y === cur ? 3.6 : 2.4, fill: full(a) ? (k === 'max' ? 'var(--trend)' : 'var(--fc)') : 'var(--panel)', stroke: k === 'max' ? 'var(--trend)' : 'var(--fc)', 'stroke-width': 1.2 })); } },
    tip: (xv) => { const y = Math.round(xv), a = byY.get(y); if (!a) return null; return { f: y, v: null, html: `<div class="h">${y}${full(a) ? '' : ' (incompleto, ' + a.n + ' d)'}</div><div class="r"><span><i style="--c:var(--trend)"></i>Máxima</span><b>${num(a.max - off(e))}</b></div><div class="n">${dmy(ISO(a.fmax))}</div><div class="r"><span><i style="--c:var(--fc)"></i>Mínima</span><b>${num(a.min - off(e))}</b></div><div class="n">${dmy(ISO(a.fmin))}</div>` }; } });
  $('#ser-c2').innerHTML = '<b>Figura 2.</b> Máxima (azul) e mínima (laranja) de cada ano (' + u + '). Círculo vazio: ano incompleto.';
  // Figura 3: curva de permanência
  const pm = new Date(t0 * DAY).getUTCMonth(), mes = []; for (const [f, v] of e.m) if (new Date(f * DAY).getUTCMonth() === pm) mes.push(v); mes.sort((a, b) => a - b);
  const curv = (arr) => { const N = arr.length, o2 = []; const st3 = Math.max(1, Math.floor(N / 400)); for (let i = N - 1; i >= 0; i -= st3) o2.push({ f: ((N - 1 - i) / (N - 1)) * 100, v: arr[i] - off(e) }); o2.push({ f: 100, v: arr[0] - off(e) }); return o2; };
  const ca = curv(B.all), cm = curv(mes), exc = (arr) => (arr.filter((v) => v >= L0).length / arr.length) * 100;
  fig($('#ser-f3'), { x0: 0, x1: 100, lo: Math.min(B.all[0] - off(e), nrv), hi: B.all[B.all.length - 1] - off(e), xt: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((v) => ({ v, t: String(v) })), xl: 'Tempo em que o nível é igualado ou superado (%)', yl: ref() ? 'Nível acima do NR (m)' : 'Leitura da régua (m)', aria: 'Curva de permanência de ' + e.nome,
    draw: (svg, xs, yl, g) => { nrDraw(svg, xs, yl, g); svg.append(sv('path', { d: pth(ca, xs, yl), fill: 'none', stroke: 'var(--ink)', 'stroke-width': 1.6 }), sv('path', { d: pth(cm, xs, yl), fill: 'none', stroke: 'var(--fc)', 'stroke-width': 1.4, 'stroke-dasharray': '5 3' })); svg.append(sv('line', { x1: xs(exc(B.all)), x2: xs(exc(B.all)), y1: yl(L0 - off(e)), y2: g.xa, stroke: 'var(--mut)', 'stroke-dasharray': '2 3' }), sv('circle', { cx: xs(exc(B.all)), cy: yl(L0 - off(e)), r: 4, fill: 'var(--ink)', stroke: 'var(--panel)', 'stroke-width': 1.5 })); },
    tip: (xv) => { const p = Math.max(0, Math.min(100, xv)), q = (arr) => arr[Math.min(arr.length - 1, Math.max(0, Math.round((1 - p / 100) * (arr.length - 1))))] - off(e); return { f: p, v: q(B.all), html: `<div class="h">Excedido em ${num(p, 0)}% do tempo</div><div class="r"><span><i style="--c:var(--ink)"></i>Série</span><b>${num(q(B.all))}</b></div><div class="r"><span><i style="--c:var(--fc)"></i>${MES[pm]}</span><b>${num(q(mes))}</b></div>` }; } });
  $('#ser-c3').innerHTML = '<b>Figura 3.</b> Curva de permanência (' + u + '): série (preta) e ' + MES[pm].toLowerCase() + ' (laranja). Ponto: hoje, ' + c(L0) + ' m, igualado ou superado em ' + num(exc(B.all), 0) + '% dos dias (' + num(exc(mes), 0) + '% em ' + MES[pm].toLowerCase() + ').';
  // anos análogos
  $('#ser-ca').textContent = 'Anos com nível próximo ao de hoje em ' + dm(P.origem) + ' (' + c(L0) + ' m) e a evolução depois. Não é previsão.';
  $('#ser-a0').textContent = 'Em ' + dm(P.origem); $('#ser-a1').textContent = 'Em ' + dm(ISO(t0 + 30));
  const an = ys.map((z) => ({ ...z, d: Math.abs(z.v - L0), a15: emData(e, z.y, t0, 15), a30: emData(e, z.y, t0, 30) })).filter((z) => z.a30 != null).sort((a, b) => a.d - b.d).slice(0, 5);
  $('#ser-ana tbody').innerHTML = an.map((z) => `<tr><td>${z.y}</td><td class="n">${c(z.v)}</td><td class="n">${z.a15 == null ? '—' : sg(z.a15 - z.v)}</td><td class="n">${sg(z.a30 - z.v)}</td><td class="n">${c(z.a30)}</td></tr>`).join('') + (an.length ? `<tr class="ms"><td>Mediana</td><td class="n"></td><td class="n">${sg(med(an.filter((z) => z.a15 != null).map((z) => z.a15 - z.v)))}</td><td class="n">${sg(med(an.map((z) => z.a30 - z.v)))}</td><td class="n"></td></tr>` : '<tr><td colspan="5">Sem anos comparáveis.</td></tr>');
  // extremos anuais
  const comp = ya.filter(([, a]) => full(a)), lin5 = (arr, k) => arr.map(([y, a]) => `<tr><td>${y}</td><td class="n">${num(a[k] - off(e))}</td><td class="hm">${dmy(ISO(k === 'max' ? a.fmax : a.fmin))}</td></tr>`).join('');
  $('#ser-min tbody').innerHTML = lin5([...comp].sort((a, b) => a[1].min - b[1].min).slice(0, 4), 'min'); $('#ser-max tbody').innerHTML = lin5([...comp].sort((a, b) => b[1].max - a[1].max).slice(0, 4), 'max');
  // consulta rápida
  $('#q-u').textContent = u; serQ();
  // ficha da série
  const fo = (D.fontes || {})[e.nome] || {}, per = f1 - f0 + 1, fa = per - B.all.length;
  $('#ser-ficha tbody').innerHTML = [['Estação', esc(e.rio) + ' · ' + esc(e.uf) + (e.ana ? ' · ANA ' + e.ana : '')], ['NR', num(e.nr) + ' m na régua · ' + esc(e.fonte_nr || '')],
    ['Período', dmy(ISO(f0)) + ' a ' + dmy(ISO(f1))], ['Dias com dado', B.all.length.toLocaleString('pt-BR') + ' (falhas: ' + num((fa / per) * 100, 1) + '%, NaN)'], ['Fonte', esc(fo.fonte || 'Planilha de réguas (Setor de Hidrografia)') + (fo.pct_consistido == null ? '' : ' · ' + num(fo.pct_consistido, 0) + '% consistido')]].concat(fo.excluido ? [['Trecho excluído', esc(fo.excluido)]] : []).map(([k, v]) => `<tr><th>${k}</th><td>${v}</td></tr>`).join('');
}
const med = (a) => { if (!a.length) return null; const b = [...a].sort((x, y) => x - y), n = b.length; return n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2; };
function serQ() {
  const e = E(), B = serBase(e), inp = $('#q-val'), res = $('#q-res'); if (!inp.value) { res.textContent = 'Digite um nível para ver quantos dias e quando isso ocorreu.'; return; }
  const x = parseFloat(String(inp.value).replace(',', '.')); if (!isFinite(x)) { res.textContent = ''; return; }
  const lim = x + off(e), abaixo = $('#q-dir').value === 'abaixo', ok = (v) => (abaixo ? v <= lim : v >= lim); let n = 0, ult = null; const anos = new Set();
  for (const [f, v] of e.m) if (ok(v)) { n++; anos.add(yOf(f)); if (ult == null || f > ult) ult = f; }
  if (!n) { res.innerHTML = `Nenhum dia da série (${B.all.length.toLocaleString('pt-BR')} dias com dado) esteve ${abaixo ? 'igual ou abaixo' : 'igual ou acima'} de <b>${num(x)} m</b>.`; return; }
  const ar = [...anos].sort((a, b) => a - b); res.innerHTML = `<b>${n.toLocaleString('pt-BR')} dias</b> (${num((n / B.all.length) * 100, 1)}% da série) ${abaixo ? 'igual ou abaixo' : 'igual ou acima'} de <b>${num(x)} m</b>. Última vez: <b>${dmy(ISO(ult))}</b>. Anos com ocorrência (${ar.length}): ${ar.length > 14 ? ar.slice(0, 6).join(', ') + ' … ' + ar.slice(-6).join(', ') : ar.join(', ')}.`;
}
$('#ser-est').addEventListener('change', (ev) => { st.est = ev.target.value; LS.set('est', st.est); serie(); });
$$('#seg-ser button').forEach((b) => b.addEventListener('click', () => { SER.jan = b.dataset.j; LS.set('ser-jan', SER.jan); serie(); }));
$('#q-val').addEventListener('input', serQ); $('#q-dir').addEventListener('change', serQ);

async function iniciar() {
  contador();
  $('#rod-v').textContent = 'versão ' + APP_VER + ' · © ' + new Date().getFullYear();
  layout(); paleta(); banner();
  if ('serviceWorker' in navigator && !window.__ZP1__) { navigator.serviceWorker.register('sw.js').then((r) => { r.addEventListener('updatefound', () => { const w = r.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) toast('Nova versão do app disponível.', 'Atualizar', () => location.reload()); }); }); }).catch(() => {}); }
  try { await carregar(false); } catch (e) { $('#carga').innerHTML = '<div class="fail">Não foi possível carregar os dados. Verifique a conexão e tente de novo.</div>'; return; }
  $('#carga').hidden = true; show(st.tab);
}
iniciar();
})();
