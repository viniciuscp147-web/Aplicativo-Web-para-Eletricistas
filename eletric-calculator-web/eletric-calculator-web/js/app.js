/* Eletric Calculator Web — telas. Toda a matemática vem de calc.js (EC). */
(function () {
'use strict';
const $ = s => document.querySelector(s), E = EC, esc = s => String(s).replace(/[&<>"']/g, c => '&#' + c.charCodeAt(0) + ';');
const COLORS = [['BLUE', 'Azul Claro', '#2563EB', 'Obrigatório para condutor Neutro (N)'], ['BLACK', 'Preto', '#1E293B', 'Condutor de Fase (R, S, T)'],
  ['RED', 'Vermelho', '#DC2626', 'Condutor de Fase (R, S, T)'], ['GREEN', 'Verde', '#16A34A', 'Obrigatório para condutor de Proteção / Terra (PE)'],
  ['WHITE', 'Branco', '#E2E8F0', 'Condutor de Fase ou Retorno de interruptores'], ['YELLOW', 'Amarelo', '#EAB308', 'Condutor de Fase ou Retorno de iluminação']];
const S = { tab: 'vd', vd: { dist: '30', sec: 2.5, cur: '16', volt: '220', tri: false }, pw: { mode: 0, w: '3500', v: '220', a: '16', pf: '1.0', tri: false },
  cab: { sec: 2.5, color: 0, m: '100' }, bud: [], client: '', project: '', margin: 0, disc: 0, tables: E.defaultTables() };
const table = () => S.tables.find(t => t.active) || null;
const n = (s, d) => E.num(s) ?? d;
const SC = { COMPLIANT: '#16A34A', WARNING: '#D97706', NON_COMPLIANT: '#DC2626' };

/* Mesma regra de entrada do app: só dígitos, ponto e vírgula; vírgula vira ponto. */
function setPath(p, v) { const [a, b] = p.split('.'); b ? S[a][b] = v : S[a] = v; }
const chip = (on, act, v, html, x = '') => `<button class="chip ${on ? 'on' : ''}" data-do="${act}" data-v="${v}" ${x}>${html}</button>`;
const inp = (p, label, ph = '') => { const [a, b] = p.split('.'); return `<label class="f"><span>${label}</span><input inputmode="decimal" data-b="${p}" data-n placeholder="${ph}" value="${esc(S[a][b])}"></label>`; };
const secChips = (cur, act, price) => `<div class="row sc">${E.SECTIONS.map(s => chip(s.mm2 === cur, act, s.mm2, s.label + (price ? `<small>${E.brl(E.unitPrice(table(), s.mm2))}/m</small>` : ''))).join('')}</div>`;
const quick = (p, vals, suf) => `<div class="row g1">${vals.map(v => `<button class="btn" data-do="set" data-v="${p}=${v}">${v}${suf}</button>`).join('')}</div>`;

/* ---------- Queda de Tensão ---------- */
const V = {};
V.vd = () => `<h1>Cálculo de Queda de Tensão</h1><p class="sub">Dimensionamento por perda máxima admissível conforme NBR 5410</p>
<div class="row g1">${[['mono', 'Monofásico / Bifásico', '2 condutores (k = 2)'], ['tri', 'Trifásico Equilibrado', '3/4 condutores (k = √3)']].map(([k, a, b]) =>
  `<button class="tb ${(S.vd.tri ? 'tri' : 'mono') === k ? 'on' : ''}" data-do="vdt" data-v="${k}"><b>${a}</b><br><small>${b}</small></button>`).join('')}</div>
<div class="row">${inp('vd.dist', 'Distância (m)')}${inp('vd.cur', 'Corrente (A)')}</div>${inp('vd.volt', 'Tensão Nominal da Rede (V)')}${quick('vd.volt', [127, 220, 380, 440], 'V')}
<div class="row sb"><h3>Seção do Cabo (mm²):</h3><b style="color:var(--p);font-size:13px">${E.kdc(S.vd.sec)} mm² selecionado</b></div>${secChips(S.vd.sec, 'vds')}
<div class="card res" id="res"></div>
<button class="big" data-do="vd2cab">Ver Preço e Tabela desta Bitola (${E.kdc(S.vd.sec)} mm²) →</button>`;
function U_vd() {
  const r = E.voltageDrop(n(S.vd.dist, 0), S.vd.sec, n(S.vd.cur, 0), n(S.vd.volt, 220), S.vd.tri ? 'tri' : 'mono'), st = E.STATUS[r.status], c = SC[r.status];
  $('#res').innerHTML = `<div class="row sb"><span class="badge" style="background:${c}26;color:${c}">${st.ok ? '✔' : '⚠'} ${st.title}</span><small style="color:var(--onv)">Limite NBR: 4,0%</small></div>
<div class="row sb" style="align-items:flex-end;margin-top:12px"><div><small style="color:var(--onv)">Perda de Tensão (%)</small><div class="num" style="color:${c}">${E.fxc(r.pct, 2)}%</div></div>
<div><small style="color:var(--onv)">Queda em Volts (ΔV)</small><div class="num2">${E.fxc(r.dV, 2)} V</div></div></div>
<div class="bar"><i style="width:${Math.min(Math.max(r.pct / 10, 0), 1) * 100}%;background:${c}"></i></div><hr>
<div class="l"><span>Tensão restante na Carga:</span><b>${E.fxc(r.finalV, 2)} V</b></div><div class="l"><span>Potência dissipada no cabo:</span><b>${E.fxc(r.loss, 1)} Watts</b></div>
${r.status === 'NON_COMPLIANT' ? `<div class="note" style="background:#DC262626;color:var(--err)"><b>ⓘ Recomendação NBR: Aumente para no mínimo ${E.kdc(r.suggested)} mm² para manter a queda abaixo de 4%.</b></div>` : ''}`;
}

/* ---------- Potência & Amperes ---------- */
V.pw = () => { const m = S.pw.mode, t = S.pw.tri; return `<h1>Cálculos de Potência e Amperes</h1><p class="sub">Lei de Ohm e Potência Elétrica (P = V × I)</p>
<div class="row g1">${['Amperes (A)', 'Potência (W)', 'Tensão (V)'].map((x, i) => `<button class="tb ${m === i ? 'on' : ''}" data-do="setn" data-v="pw.mode=${i}">${x}</button>`).join('')}</div>
<div class="card row sb" style="padding:10px 14px"><div><b>${t ? 'Sistema Trifásico (√3 ≈ 1,732)' : 'Sistema Monofásico / Bifásico'}</b><br><small style="color:var(--onv)">${t ? 'Fórmula com fator trifásico raiz de 3' : 'Fórmula direta para 1 ou 2 fases'}</small></div>
<input type="checkbox" data-c="pw.tri" ${t ? 'checked' : ''} style="width:24px;height:24px;accent-color:var(--p)"></div>
${m === 0 ? inp('pw.w', 'Potência em Watts (W)', 'Ex: 5500 ou 7500') + quick('pw.w', [1200, 3500, 5500, 7500], 'W') + inp('pw.v', 'Tensão da Rede (V)') + quick('pw.v', [110, 127, 220, 380], 'V') : ''}
${m === 1 ? inp('pw.v', 'Tensão da Rede (V)') + inp('pw.a', 'Corrente em Amperes (A)') + quick('pw.a', [10, 16, 20, 32, 40], 'A') : ''}
${m === 2 ? inp('pw.w', 'Potência em Watts (W)') + inp('pw.a', 'Corrente em Amperes (A)') : ''}
${inp('pw.pf', 'Fator de Potência (cos φ / FP)', '1.0 para resistivo, 0.92 para motores')}<div class="card res" id="res"></div>`; };
function pwCalc() { const p = S.pw, w = n(p.w, 0), v = n(p.v, 0), a = n(p.a, 0), pf = n(p.pf, 1), t = p.tri;
  return p.mode === 0 ? E.power.current(w, v, pf, t) : p.mode === 1 ? E.power.power(v, a, pf, t) : E.power.voltage(w, a, pf, t); }
function U_pw() {
  const r = pwCalc(), cur = S.pw.mode === 0 && r.value > 0, sec = cur ? (E.SECTIONS.find(s => s.currentA >= r.value) || E.SECTIONS[E.SECTIONS.length - 1]) : null;
  $('#res').innerHTML = `<div style="color:var(--onv)">${['Corrente Resultante (I)', 'Potência Resultante (P)', 'Tensão Resultante (V)'][S.pw.mode]}</div><div class="num" style="color:var(--p);font-size:32px">${r.formatted}</div><hr>
<div class="l"><span>Fórmula Utilizada:</span><b>${r.formula}</b></div>
${cur ? `<div class="note"><b>Dimensionamento Recomendado (NBR 5410):</b><br>• Cabo sugerido: ${sec.label} (suporta até ${E.kd(sec.currentA)}A)<br>• Disjuntor sugerido: ${sec.breakerA}A (Curva C)</div>
<button class="big" data-do="pw2vd" data-v="${sec.mm2}">Calcular Queda de Tensão para esta Corrente →</button>` : ''}`;
}

/* ---------- Preço dos Cabos ---------- */
V.cab = () => { const t = table(), col = COLORS[S.cab.color], info = E.sectionInfo(S.cab.sec); return `
<div class="card" style="background:var(--pc);color:var(--onpc);margin-top:0"><label class="f" style="margin:0"><span style="color:inherit">⟳ ${t ? esc(t.supplierName) : 'Sil Fios e Cabos'} — ${t ? E.weekTitle(t) : 'Tabela Semanal Vigente'}</span>
<select data-t>${S.tables.map(x => `<option value="${x.id}" ${x.active ? 'selected' : ''}>${esc(x.supplierName)} — Sem. ${x.week}/${x.year}</option>`).join('')}</select></label></div>
<div class="pv"><div class="cut">${cut(S.cab.sec, col[2])}</div><div><b>Cabo Flexível ${E.kdc(S.cab.sec)} mm²</b><br><small style="color:var(--onv)">Isolação: ${col[1]} (PVC 70°C)</small><br><small style="color:var(--p);font-weight:600">Tensão 750V • NBR NM 247-3 • Cobre Cl. 5</small></div></div>
<div class="row sb"><h3>1. Seção do Cabo (Bitola)</h3><small style="color:var(--p)">Padrão NBR NM 247-3</small></div>${secChips(S.cab.sec, 'cabs', true)}
<h3 style="margin-bottom:0">2. Cor da Isolação</h3><small style="color:var(--onv)">${col[3]}</small>
<div class="row sc" style="margin-top:8px">${COLORS.map((c, i) => `<button class="col ${i === S.cab.color ? 'on' : ''}" data-do="setn" data-v="cab.color=${i}"><span class="dot" style="background:${c[2]}"></span>${c[1]}</button>`).join('')}</div>
<h3>3. Quantidade em Metros</h3><div class="row">${inp('cab.m', 'Metros (m)').replace('class="f"', 'class="f" style="margin:0"')}<button class="ic" data-do="addm" data-v="-10">−</button><button class="ic" data-do="addm" data-v="10">+</button></div>
<div class="row g1" style="margin-top:8px">${[50, 100, 200, 500].map(m => `<button class="btn" data-do="set" data-v="cab.m=${m}">${m === 100 ? '1 Rolo (100m)' : m + 'm'}</button>`).join('')}</div>
<div class="card res" id="res"></div>
<button class="big" data-do="addb">🛒 Adicionar ao Orçamento</button>${S.bud.length ? `<button class="big o" data-do="go" data-v="bud">Ver Orçamento Completo (${S.bud.length} ${S.bud.length === 1 ? 'item' : 'itens'}) →</button>` : ''}`; };
function cut(mm2, color) { // corte transversal (CableCutCanvas): isolação + cobre + fios
  const sc = mm2 <= 1 ? .45 : mm2 <= 2.5 ? .55 : mm2 <= 6 ? .68 : mm2 <= 16 ? .8 : mm2 <= 50 ? .9 : 1, R = 38 * sc, cr = R * .58, sr = cr / 3.4, k = mm2 >= 10 ? 12 : 7, rr = cr - sr - 1;
  let g = `<circle cx="40" cy="40" r="${R}" fill="${color}" stroke="#fff6"/><circle cx="40" cy="40" r="${cr + 2}" fill="#0006"/><circle cx="40" cy="40" r="${cr}" fill="#D97706"/><circle cx="40" cy="40" r="${sr}" fill="#FDE68A" stroke="#78350F"/>`;
  for (let i = 0; i < k; i++) { const a = 2 * Math.PI * i / k; g += `<circle cx="${(40 + rr * Math.cos(a)).toFixed(1)}" cy="${(40 + rr * Math.sin(a)).toFixed(1)}" r="${sr.toFixed(1)}" fill="#F59E0B" stroke="#78350F"/>`; }
  return `<svg width="80" height="80" viewBox="0 0 80 80">${g}</svg>`;
}
function U_cab() {
  const t = table(), sec = S.cab.sec, up = E.unitPrice(t, sec), disc = t ? t.disc : 5.0, m = n(S.cab.m, 0), info = E.sectionInfo(sec);
  const rolls = Math.trunc(m / 100), left = m % 100;
  $('#res').innerHTML = `<div class="row sb"><div><small style="color:var(--onv)">Valor Total Estimado</small><div class="num2" style="text-align:left;color:var(--p)">${E.brl(E.cableTotal(m, up, disc))}</div></div>
<span class="badge" style="background:var(--sc);color:var(--onsc)">${E.brl(up)}/m</span></div><hr>
<div class="l"><span>Composição:</span><b>${rolls > 0 && left > 0 ? `${rolls} rolo(s) de 100m + ${Math.trunc(left)}m fracionados` : rolls > 0 ? `${rolls} rolo(s) de 100m fechados (-${Math.trunc(disc)}% desc.)` : `${Math.trunc(m)}m corte avulso`}</b></div>
<div class="l"><span>Capacidade de Corrente (NBR 5410):</span><b>${E.kd(info.currentA)} A (${info.app})</b></div>
<div class="l"><span>Disjuntor Recomendado:</span><b style="color:var(--p)">Disjuntor ${info.breakerA}A (Curva C)</b></div>
<div class="l"><span>Peso Estimado de Cobre:</span><b>${E.fx(E.copperKg(m, sec), 2)} kg</b></div>`;
}

/* ---------- Orçamento ---------- */
V.bud = () => {
  if (!S.bud.length) return `<div class="empty">🛒<b>Seu orçamento está vazio</b>Selecione a bitola, metros e cor na Calculadora para compor sua lista de materiais.<button class="big" data-do="go" data-v="cab" style="max-width:260px;margin:24px auto 0">+ Ir para a Calculadora</button></div>`;
  return `<div class="row sb"><div><h1>Orçamento da Obra</h1><p class="sub" style="margin:0">${S.bud.length} ${S.bud.length === 1 ? 'item adicionado' : 'itens adicionados'}</p></div><button class="x" data-do="clr" title="Limpar tudo">🗑</button></div>
<div class="card"><label class="f" style="margin-top:0"><span>Nome do Cliente (opcional)</span><input data-b="client" value="${esc(S.client)}"></label><label class="f"><span>Nome da Obra / Local (opcional)</span><input data-b="project" value="${esc(S.project)}"></label></div>
<h3>Itens Cotados</h3>${S.bud.map(i => { const c = COLORS.find(x => x[0] === i.colorKey), rolls = Math.trunc(i.meters / 100), left = i.meters % 100, m = Math.trunc(i.meters);
  const d = rolls > 0 && left > 0 ? `${m}m (${rolls} rolo(s) + ${Math.trunc(left)}m)` : rolls > 0 ? `${m}m (${rolls} rolo(s) fechados)` : `${m}m avulsos`;
  return `<div class="item"><span class="dot" style="background:${c[2]};color:${['WHITE', 'YELLOW'].includes(i.colorKey) ? '#1E293B' : '#fff'}">${E.kdc(i.sec)}</span><div style="flex:1"><b>Cabo ${E.kdc(i.sec)} mm² - ${c[1]}</b><br><small style="color:var(--onv)">${d} • ${E.brl(i.unitPrice)}/m</small><br><b style="color:var(--p)">Subtotal: ${E.brl(E.itemTotal(i))}</b></div><button class="x" data-do="delb" data-v="${i.id}">✕</button></div>`; }).join('')}
<div class="card" style="background:var(--sv)"><b>Ajustes Comerciais</b>
<div class="l row sb" style="margin-top:10px"><small>Margem de Lucro / Instalação</small><b id="lm"></b></div><input type="range" min="0" max="50" step="5" data-b="margin" data-r value="${S.margin}">
<div class="l row sb"><small>Desconto Comercial Concedido</small><b id="ld"></b></div><input type="range" min="0" max="25" step="5" data-b="disc" data-r value="${S.disc}"></div>
<div class="tot res" id="res"></div>
<div class="row" style="margin-top:18px"><button class="big" style="flex:1;margin:0;background:var(--sc);color:var(--onsc)" data-do="share">↗ WhatsApp</button><button class="ic" data-do="copy" title="Copiar texto">⧉</button></div>`;
};
function U_bud() {
  if (!S.bud.length) return;
  const q = E.quoteTotals(S.bud, S.disc, S.margin);
  $('#lm').textContent = `+${Math.trunc(S.margin)}%`; $('#ld').textContent = `-${Math.trunc(S.disc)}%`;
  $('#res').innerHTML = `<div class="l"><span>Total de Cabos:</span><b>${Math.trunc(q.meters)} metros</b></div><div class="l"><span>Peso Total de Cobre:</span><b>${E.fx(q.kg, 2)} kg</b></div>
<div class="l"><span>Subtotal Tabela Fornecedor:</span><b>${E.brl(q.subtotal)}</b></div><hr><div class="row sb"><b style="font-size:16px">TOTAL GERAL:</b><span class="big2" style="font-size:24px;font-weight:800;color:var(--p)">${E.brl(q.total)}</span></div>`;
}
const quoteText = () => E.shareText({ table: table(), items: S.bud, client: S.client, project: S.project, disc: S.disc, margin: S.margin });

/* ---------- Ações, navegação e eventos ---------- */
const U = { vd: U_vd, pw: U_pw, cab: U_cab, bud: U_bud };
const A = {
  go: v => { S.tab = v; },
  set: v => { const [p, x] = v.split('='); setPath(p, x); }, setn: v => { const [p, x] = v.split('='); setPath(p, +x); },
  vdt: v => { S.vd.tri = v === 'tri'; }, vds: v => { S.vd.sec = +v; }, cabs: v => { S.cab.sec = +v; },
  vd2cab: () => { S.cab.sec = S.vd.sec; S.cab.m = E.clean(S.vd.dist); S.tab = 'cab'; },
  pw2vd: v => { S.vd.cur = E.clean(E.fx(pwCalc().value, 1)); S.vd.volt = E.clean(S.pw.v); S.vd.sec = +v; S.tab = 'vd'; },
  addm: v => { const u = Math.max(n(S.cab.m, 0) + +v, 1); S.cab.m = Number.isInteger(u) ? String(u) : E.fx(u, 1); },
  addb: () => { const m = n(S.cab.m, 0); if (m <= 0) return toast('Informe a quantidade de metros do cabo.'), 0; const t = table(), c = COLORS[S.cab.color];
    S.bud.push({ id: Date.now() + '' + S.bud.length, sec: S.cab.sec, colorKey: c[0], colorName: c[1], meters: m, unitPrice: E.unitPrice(t, S.cab.sec), discount: t ? t.disc : 5.0 });
    toast(`Adicionado: ${Math.trunc(m)}m de ${E.kdc(S.cab.sec)} mm² (${c[1]})`); },
  delb: v => { S.bud = S.bud.filter(i => i.id !== v); },
  clr: () => { if (!confirm('Limpar Orçamento?\nDeseja remover todos os cabos adicionados da lista?')) return 0; S.bud = []; },
  share: () => { const text = quoteText(); if (navigator.share) navigator.share({ title: 'Compartilhar Orçamento', text }).catch(() => {}); else open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener'); return 0; },
  copy: () => { const text = quoteText(), ok = () => toast('Texto do orçamento copiado.');
    (navigator.clipboard ? navigator.clipboard.writeText(text) : Promise.reject()).then(ok, () => { const a = document.createElement('textarea'); a.value = text; document.body.append(a); a.select(); document.execCommand('copy'); a.remove(); ok(); }); return 0; }
};
let last;
function render() {
  $('#view').innerHTML = V[S.tab](); U[S.tab](); if (last !== S.tab) scrollTo(0, 0); last = S.tab;
  $('#nav').innerHTML = [['vd', '📉', 'Queda Tensão'], ['pw', '⚡', 'Potência & A'], ['cab', '🔌', 'Cabos'], ['bud', '🛒', 'Orçamento']].map(([k, i, l]) =>
    `<button class="${S.tab === k ? 'on' : ''}" data-do="go" data-v="${k}"><b>${i}</b>${l}${k === 'bud' && S.bud.length ? `<i>${S.bud.length}</i>` : ''}</button>`).join('');
}
let tt; function toast(m) { const t = $('#toast'); t.textContent = m; t.style.display = 'block'; clearTimeout(tt); tt = setTimeout(() => t.style.display = 'none', 3000); }
document.addEventListener('click', e => { const b = e.target.closest('[data-do]'); if (!b) return; if (A[b.dataset.do](b.dataset.v) !== 0 || b.dataset.do === 'addb') render(); });
document.addEventListener('input', e => { const el = e.target.closest('[data-b]'); if (!el) return;
  if (el.dataset.n !== undefined) { const c = E.clean(el.value); if (c !== el.value) el.value = c; setPath(el.dataset.b, c); }
  else setPath(el.dataset.b, el.dataset.r !== undefined ? +el.value : el.value);
  if (!['client', 'project'].includes(el.dataset.b)) U[S.tab](); });
document.addEventListener('change', e => { const c = e.target.closest('[data-c]'), t = e.target.closest('[data-t]');
  if (c) { const [a, b] = c.dataset.c.split('.'); S[a][b] = c.checked; render(); }
  if (t) { S.tables.forEach(x => x.active = x.id === t.value); render(); toast('Tabela ativa atualizada!'); } });
render();
})();
