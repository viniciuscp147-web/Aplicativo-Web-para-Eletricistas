/* Eletric Calculator Web — núcleo de cálculo.
 * Port fiel de: ElectricalCalculations.kt, CableModels.kt, CableRepository.kt, DefaultSupplierData.kt,
 * CableViewModel.kt (formatação/compartilhamento). Funciona no navegador (window.EC) e no Node (require). */
(function (r, f) { typeof module === 'object' && module.exports ? module.exports = f() : r.EC = f(); })(this, function () {
'use strict';

/* ---------- Formatação idêntica ao Android ----------
 * String.format("%.Nf") do Java = HALF_UP sobre os dígitos decimais mais curtos do double.
 * NumberFormat pt-BR (ICU) = HALF_EVEN sobre os mesmos dígitos. toFixed() do JS NÃO faz isso (1.005 -> "1.00"). */
function dec(x, d, even) {
  if (!isFinite(x)) return String(x);
  const [m, e] = Math.abs(x).toExponential().split('e');
  const ds = m.replace('.', ''), keep = +e + 1 + d;
  const kept = keep > 0 ? ds.slice(0, keep).padEnd(keep, '0') : '';
  const rest = keep >= 0 ? ds.slice(keep) : '0';
  const r0 = rest[0] || '0', tail = rest.slice(1);
  const up = even ? (r0 > '5' || (r0 === '5' && (/[1-9]/.test(tail) || +(kept.slice(-1) || '0') % 2 === 1))) : r0 >= '5';
  const n = (BigInt(kept || '0') + (up ? 1n : 0n)).toString().padStart(d + 1, '0');
  return (x < 0 ? '-' : '') + (d ? n.slice(0, -d) + '.' + n.slice(-d) : n);
}
const fx = (x, d) => dec(x, d, false);                         // "%.{d}f" (Locale.US)
const fxc = (x, d) => fx(x, d).replace('.', ',');               // idem com vírgula
const brl = x => {                                              // NumberFormat.getCurrencyInstance(pt-BR)
  const s = dec(x, 2, true), neg = s[0] === '-', [i, fr] = s.replace('-', '').split('.');
  return (neg ? '-' : '') + 'R$\u00a0' + i.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ',' + fr;
};
const kd = x => Number.isInteger(x) && Math.abs(x) < 1e7 ? x.toFixed(1) : String(x);  // Double.toString() do Kotlin
const kdc = x => kd(x).replace('.', ',');
/* Filtro + toDoubleOrNull() do original. Retorna null se inválido. */
const clean = (s, neg) => String(s).replace(neg ? /[^0-9.,-]/g : /[^0-9.,]/g, '').replace(/,/g, '.');
const num = (s, neg) => { const t = clean(s, neg); return (neg ? /^-?(\d+\.?\d*|\.\d+)$/ : /^(\d+\.?\d*|\.\d+)$/).test(t) ? +t : null; };

/* ---------- Bitolas (StandardCableSections) ---------- */
const SECTIONS = [
  [0.5, 9, 6, 4.8, 2.1, 'Sinalização, interfonia e comando'],
  [0.75, 12, 10, 7.2, 2.3, 'Luminárias, abajures e ligação de aparelhos'],
  [1.0, 14.5, 10, 9.6, 2.5, 'Circuitos de comando e pequenos pontos'],
  [1.5, 17.5, 10, 14.4, 2.8, 'Mínimo NBR 5410 para Iluminação'],
  [2.5, 24, 20, 24, 3.5, 'Mínimo NBR 5410 para Tomadas de Uso Geral (TUG)'],
  [4.0, 32, 25, 38.4, 4.1, 'Chuveiros 127V/220V (até 5500W), Tomadas TUE'],
  [6.0, 41, 32, 57.6, 4.7, 'Chuveiros potentes (7500W), Ar-Condicionado grande'],
  [10.0, 57, 50, 96, 6.0, 'Entrada padrão, alimentador QDC bifásico/trifásico'],
  [16.0, 76, 70, 153.6, 7.2, 'Alimentador principal de residências de alto padrão'],
  [25.0, 101, 90, 240, 8.8, 'Entradas de força comerciais e painéis centrais'],
  [35.0, 125, 100, 336, 10.2, 'Entradas gerais de edifícios e subestações'],
  [50.0, 151, 125, 480, 12.1, 'Alimentadores industriais e comerciais pesados'],
  [70.0, 192, 175, 672, 14.2, 'Grandes centros de medição e alimentadores primários'],
  [95.0, 232, 200, 912, 16.5, 'Distribuição pesada e entradas de edifícios'],
  [120.0, 269, 250, 1152, 18.2, 'Alimentação de transformadores e grandes quadros']
].map(([mm2, currentA, breakerA, kgKm, diamMm, app]) => ({ mm2, label: kdc(mm2) + ' mm²', currentA, breakerA, kgKm, diamMm, app }));
const sectionInfo = s => SECTIONS.find(x => x.mm2 === s) || { mm2: s, label: s + ' mm²', currentA: 0, breakerA: 0, kgKm: 0, diamMm: 0, app: 'Uso especializado' };

/* ---------- Queda de tensão (VoltageDropCalculator) ---------- */
const K = { mono: 2.0, tri: Math.sqrt(3) };
const RHO_70C = 0.0210, RHO_20C = 0.0178;
const STATUS = {
  COMPLIANT: { title: 'Em Conformidade NBR 5410', ok: true },
  WARNING: { title: 'Atenção (Alimentador)', ok: true },
  NON_COMPLIANT: { title: 'Queda Excessiva (Não Conforme)', ok: false }
};
function voltageDrop(dist, sec, cur, volt, type, op70 = true) {
  if (dist <= 0 || sec <= 0 || cur <= 0 || volt <= 0)
    return { dV: 0, pct: 0, finalV: volt, status: 'COMPLIANT', suggested: sec, loss: 0 };
  const rho = op70 ? RHO_70C : RHO_20C, k = K[type];
  const dV = (k * rho * dist * cur) / sec;
  const pct = (dV / volt) * 100.0;
  const finalV = Math.max(volt - dV, 0.0);
  const status = pct <= 4.0 ? 'COMPLIANT' : pct <= 7.0 ? 'WARNING' : 'NON_COMPLIANT';
  const rw = (rho * dist) / sec;
  const loss = (type === 'mono' ? 2.0 : 3.0) * rw * cur * cur;
  const minS = (k * rho * dist * cur) / (0.04 * volt);
  const hit = SECTIONS.find(s => s.mm2 >= minS);
  return { dV, pct, finalV, status, suggested: (hit || SECTIONS[SECTIONS.length - 1]).mm2, loss };
}

/* ---------- Potência / Lei de Ohm (PowerCalculator) ---------- */
const pf1 = pf => Math.min(Math.max(pf, 0.1), 1.0);
const ph = t => t ? Math.sqrt(3) : 1.0;
const power = {
  current(w, v, pf = 1, tri = false) {
    const d = v * ph(tri) * pf1(pf), val = d > 0 ? w / d : 0.0;
    return { value: val, formatted: fxc(val, 2) + ' A', formula: tri ? 'I = P / (√3 × V × FP)' : 'I = P / (V × FP)' };
  },
  power(v, a, pf = 1, tri = false) {
    const val = v * a * ph(tri) * pf1(pf);
    return { value: val, formula: tri ? 'P = √3 × V × I × FP' : 'P = V × I × FP',
      formatted: val >= 1000 ? `${fxc(val / 1000.0, 2)} kW (${fxc(val, 0)} W)` : fxc(val, 1) + ' W' };
  },
  voltage(w, a, pf = 1, tri = false) {
    const d = a * ph(tri) * pf1(pf), val = d > 0 ? w / d : 0.0;
    return { value: val, formatted: fxc(val, 1) + ' V', formula: tri ? 'V = P / (√3 × I × FP)' : 'V = P / (I × FP)' };
  }
};

/* ---------- Cabos / Orçamento (BudgetItem, SavedQuote) ---------- */
const rollUnit = (up, disc) => up * 100 * (1.0 - disc / 100.0);
const cableTotal = (m, up, disc) => Math.trunc(m / 100) * rollUnit(up, disc) + (m % 100) * up;
const copperKg = (m, sec) => (m / 1000.0) * sectionInfo(sec).kgKm;
const itemTotal = i => cableTotal(i.meters, i.unitPrice, i.discount);
const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const quoteTotals = (items, disc, margin) => {
  const subtotal = sum(items, itemTotal);
  return { subtotal, meters: sum(items, i => i.meters), kg: sum(items, i => copperKg(i.meters, i.sec)),
    total: (subtotal * (1.0 - disc / 100.0)) * (1.0 + margin / 100.0) };
};

/* ---------- Tabelas semanais (DefaultSupplierData + CableRepository) ---------- */
const PRICES = {
  sil: [1.45, 1.85, 2.20, 2.85, 4.55, 7.30, 11.10, 18.80, 29.50, 45.90, 63.50, 91.20, 130.50, 179.00, 228.00],
  cob: [1.42, 1.80, 2.15, 2.78, 4.48, 7.15, 10.90, 18.40, 28.90, 45.20, 62.10, 89.80, 128.00, 175.00, 224.00],
  pry: [1.55, 1.95, 2.35, 3.05, 4.85, 7.70, 11.65, 19.60, 30.80, 47.90, 66.00, 94.50, 135.00, 185.00, 235.00]
};
const pmap = a => Object.fromEntries(a.map((p, i) => [SECTIONS[i].mm2, p]));
const adjustPrices = (prices, pct) => {                         // applyCopperAdjustment / createNewWeeklyTable
  const f = 1.0 + pct / 100.0;
  return Object.fromEntries(Object.entries(prices).map(([k, p]) => [k, Math.trunc(p * f * 100.0) / 100.0]));
};
function defaultTables(now = Date.now()) {
  const T = (id, name, wk, s, e, active, adj, p, disc, ago, notes) => ({ id, supplierName: name, week: wk, year: 2026,
    start: s, end: e, active, adj, prices: p, disc, updatedAt: now - ago, notes });
  return [
    T('table_sil_w43_2026', 'Sil Fios e Cabos', 43, '19/10/2026', '25/10/2026', true, 2.4, pmap(PRICES.sil), 5.0, 0, 'Tabela oficial semanal atualizada com base na cotação LME do cobre (+2,4%).'),
    T('table_cobrecom_w43_2026', 'Cobrecom Cabos Elétricos', 43, '19/10/2026', '25/10/2026', false, 1.8, pmap(PRICES.cob), 6.0, 86400000, 'Tabela distribuidor Cobrecom vigente para pronta entrega.'),
    T('table_prysmian_w43_2026', 'Prysmian Group (Superastic)', 43, '19/10/2026', '25/10/2026', false, 3.0, pmap(PRICES.pry), 4.0, 172800000, 'Linha antichama BWF com certificação Inmetro e selo Qualifio.'),
    T('table_sil_w42_2026', 'Sil Fios e Cabos', 42, '12/10/2026', '18/10/2026', false, 0.0,
      Object.fromEntries(Object.entries(pmap(PRICES.sil)).map(([k, p]) => [k, Math.trunc(p / 1.024 * 100.0) / 100.0])), 5.0, 7 * 86400000, 'Tabela arquivada da semana anterior.')
  ];
}
const weekTitle = t => `Semana ${t.week}/${t.year} (${t.start} a ${t.end})`;
const unitPrice = (t, sec) => t ? (t.prices[sec] ?? 0.0) : (pmap(PRICES.sil)[sec] ?? 4.55);

/* ---------- Texto de compartilhamento (buildShareableQuoteText) ---------- */
function shareText(o) {
  const { table, items, client, project, disc, margin } = o, q = quoteTotals(items, disc, margin);
  const L = ['📋 *ORÇAMENTO DE CABOS ELÉTRICOS*', '════════════════════════════'];
  if (client.trim()) L.push(`👤 *Cliente:* ${client}`);
  if (project.trim()) L.push(`📍 *Obra:* ${project}`);
  L.push(`🏢 *Fornecedor:* ${table ? table.supplierName : 'Sil / Cobrecom'}`, `📅 *Vigência:* ${table ? weekTitle(table) : 'Semana Vigente'}`, '════════════════════════════', '', '📦 *ITENS:*');
  items.forEach((it, n) => {
    const rolls = Math.trunc(it.meters / 100), left = it.meters % 100;
    const rs = rolls > 0 ? (left > 0 ? ` (${rolls} rolos + ${Math.trunc(left)}m)` : ` (${rolls} rolos de 100m)`) : '';
    L.push(`${n + 1}. *Cabo Flexível ${kdc(it.sec)} mm² - ${it.colorName}*`, `   • Metragem: ${Math.trunc(it.meters)}m${rs}`,
      `   • Unitário: ${brl(it.unitPrice)}/m`, `   • Subtotal: *${brl(itemTotal(it))}*`, '');
  });
  L.push('════════════════════════════', `📏 *Total de Cabos:* ${Math.trunc(q.meters)} metros`, `⚖️ *Peso Estimado Cobre:* ${fx(q.kg, 2)} kg`, `💵 *Subtotal:* ${brl(q.subtotal)}`);
  if (disc > 0) L.push(`🏷️ *Desconto (${kd(disc)}%):* -${brl(q.subtotal * disc / 100.0)}`);
  if (margin > 0) L.push(`📈 *Margem (${kd(margin)}%):* +${brl(q.subtotal * (1.0 - disc / 100.0) * margin / 100.0)}`);
  L.push(`💰 *TOTAL: ${brl(q.total)}*`, '════════════════════════════', 'ℹ️ *Normas:* NBR NM 247-3 / NBR 5410.', 'Gerado por Eletric Calculator');
  return L.join('\n');
}

return { dec, fx, fxc, brl, kd, kdc, clean, num, SECTIONS, sectionInfo, K, STATUS, voltageDrop, power, rollUnit, cableTotal, copperKg,
  itemTotal, quoteTotals, adjustPrices, defaultTables, weekTitle, unitPrice, shareText };
});
