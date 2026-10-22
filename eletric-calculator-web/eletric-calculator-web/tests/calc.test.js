// Executar: node --test tests/      (Node 20+; não precisa instalar nada)
const test = require('node:test'), assert = require('node:assert/strict');
const EC = require('../js/calc.js'), REF = require('./java-reference.json');
const near = (a, b, t) => assert.ok(Math.abs(a - b) <= t, `${a} != ${b} (±${t})`);

/* 1) Casos do ExampleUnitTest.kt do app Android, com as mesmas tolerâncias */
test('Android: queda de tensão monofásica', () => {
  const r = EC.voltageDrop(30, 2.5, 16, 220, 'mono');
  near(r.dV, 8.064, 0.05); near(r.pct, 3.665, 0.05); assert.equal(r.status, 'COMPLIANT');
});
test('Android: queda de tensão trifásica', () => {
  const r = EC.voltageDrop(50, 4, 25, 380, 'tri');
  near(r.dV, 11.366, 0.1); near(r.pct, 2.99, 0.1); assert.equal(r.status, 'COMPLIANT');
});
test('Android: potência / corrente / tensão', () => {
  near(EC.power.current(5500, 220, 1, false).value, 25, 0.01);
  near(EC.power.power(220, 16, 1, false).value, 3520, 0.01);
  near(EC.power.voltage(4400, 20, 1, false).value, 220, 0.01);
});
test('Android: rolos e corte (250 m, R$ 4,55/m, 5%)', () => {
  const it = { sec: 2.5, meters: 250, unitPrice: 4.55, discount: 5 };
  assert.equal(Math.trunc(it.meters / 100), 2); near(it.meters % 100, 50, 0.001);
  near(EC.rollUnit(4.55, 5), 432.25, 0.01);
  near(EC.itemTotal(it), 2 * 432.25 + 50 * 4.55, 0.01);
  assert.equal(EC.brl(EC.itemTotal(it)), 'R$\u00a01.092,00');
});

/* 2) Regras de negócio lidas no código-fonte */
test('limiares 4% / 7% e bitola sugerida', () => {
  assert.equal(EC.voltageDrop(30, 2.5, 16, 220, 'mono').status, 'COMPLIANT');
  assert.equal(EC.voltageDrop(60, 2.5, 20, 220, 'mono').status, 'NON_COMPLIANT');
  assert.equal(EC.voltageDrop(0, 2.5, 16, 220, 'mono').pct, 0);
  assert.equal(EC.voltageDrop(100, 2.5, 10, 100, 'mono').suggested, 16); // S_min = 2*0,021*100*10/(0,04*100) = 10,5 -> 16 mm²
});
test('fator de potência é limitado a [0,1; 1,0]', () => {
  assert.equal(EC.power.current(1000, 100, 5).value, 10);
  assert.equal(EC.power.current(1000, 100, 0.01).value, 100);
});
test('texto de resultado em pt-BR', () => {
  assert.equal(EC.power.current(3500, 220).formatted, '15,91 A');
  assert.equal(EC.power.power(220, 16).formatted, '3,52 kW (3520 W)');
  assert.equal(EC.power.power(127, 5).formatted, '635,0 W');
});
test('entrada numérica: mesmo filtro e toDoubleOrNull do original', () => {
  assert.equal(EC.num('12,5'), 12.5); assert.equal(EC.num('.5'), 0.5); assert.equal(EC.num('5.'), 5);
  assert.equal(EC.num(''), null); assert.equal(EC.num('1.2.3'), null); assert.equal(EC.num('abc'), null);
  assert.equal(EC.num('-2,5', true), -2.5);
});
test('tabelas: reajuste trunca (não arredonda) em 2 casas', () => {
  const sil = EC.defaultTables()[0].prices;
  assert.equal(EC.adjustPrices(sil, 2.5)[2.5], 4.66);   // 4.55*1.025*100 = 466.37 -> 4.66
  assert.equal(EC.defaultTables()[3].prices[2.5], 4.44); // 4.55/1.024 = 4.4433 -> 4.44
  assert.equal(EC.defaultTables()[0].active, true);
  assert.equal(EC.weekTitle(EC.defaultTables()[0]), 'Semana 43/2026 (19/10/2026 a 25/10/2026)');
});
test('kd() reproduz Double.toString do Kotlin', () => {
  assert.equal(EC.kd(10), '10.0'); assert.equal(EC.kd(0.75), '0.75'); assert.equal(EC.kdc(24), '24,0'); assert.equal(EC.SECTIONS[7].label, '10,0 mm²');
});
test('texto do WhatsApp', () => {
  const t = EC.shareText({ table: EC.defaultTables()[0], client: 'Ana', project: '', disc: 5, margin: 10,
    items: [{ sec: 2.5, colorName: 'Azul Claro', meters: 250, unitPrice: 4.55, discount: 5 }] });
  assert.match(t, /1\. \*Cabo Flexível 2,5 mm² - Azul Claro\*/); assert.match(t, /\(2 rolos \+ 50m\)/);
  assert.match(t, /Desconto \(5\.0%\)/); assert.match(t, /Peso Estimado Cobre:\* 6\.00 kg/); assert.ok(!t.includes('Obra'));
});

/* 3) Referência executada na JVM (java-reference.json, gerado por tests/GenRef.java) */
test('JVM: String.format %.0f/%.1f/%.2f idêntico em 4000 valores (inclui empates como 1.005)', () => {
  for (const [x, f0, f1, f2] of REF.fmt) { const v = Number(x);
    assert.equal(EC.fx(v, 0), f0, x); assert.equal(EC.fx(v, 1), f1, x); assert.equal(EC.fx(v, 2), f2, x); }
});
test('JVM: queda de tensão idêntica bit a bit em 3000 casos', () => {
  for (const { in: [d, s, c, v, tri], out: [dV, pct, fin, loss, sug, st, sp, sv, sl] } of REF.vd) {
    const r = EC.voltageDrop(d, s, c, v, tri ? 'tri' : 'mono');
    assert.equal(r.dV, dV); assert.equal(r.pct, pct); assert.equal(r.finalV, fin); assert.equal(r.loss, loss);
    assert.equal(r.suggested, sug); assert.equal(r.status, st);
    assert.equal(EC.fx(r.pct, 2), sp); assert.equal(EC.fx(r.dV, 2), sv); assert.equal(EC.fx(r.loss, 1), sl);
  }
});
test('JVM: potência/corrente/tensão idênticas em 3000 casos', () => {
  for (const { in: [w, v, a, pf, tri], out: [cu, cuS, po, poS, vo, voS] } of REF.pw) {
    const c = EC.power.current(w, v, pf, tri), p = EC.power.power(v, a, pf, tri), o = EC.power.voltage(w, a, pf, tri);
    assert.equal(c.value, cu); assert.equal(c.formatted, cuS.replace('.', ',') + ' A');
    assert.equal(p.value, po); assert.equal(p.formatted, poS.replace(/\./g, ','));
    assert.equal(o.value, vo); assert.equal(o.formatted, voS.replace('.', ',') + ' V');
  }
});
test('JVM: rolos, total e peso de cobre idênticos em 3000 casos', () => {
  for (const { in: [m, up, dc, sec], out: [rolls, left, tot, kg, kgS] } of REF.bud) {
    assert.equal(Math.trunc(m / 100), rolls); assert.equal(m % 100, left);
    assert.equal(EC.cableTotal(m, up, dc), tot); assert.equal(EC.copperKg(m, sec), kg); assert.equal(EC.fx(kg, 2), kgS);
  }
});

/* 4) Moeda: confronto com o ICU real (mesma biblioteca do Android) em HALF_EVEN */
test('ICU: R$ pt-BR idêntico ao NumberFormat (HALF_EVEN) em 20000 valores', t => {
  let nf; try { nf = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', roundingMode: 'halfEven' }); } catch { return t.skip('Intl sem roundingMode'); }
  if (nf.resolvedOptions().roundingMode !== 'halfEven') return t.skip('Intl sem roundingMode');
  let s = 7; const rnd = () => (s = (s * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 20000; i++) { const v = i % 2 ? Math.round(rnd() * 5e7) / 1000 : Math.round(rnd() * 5e6) / 8 / 100 * 8; assert.equal(EC.brl(v), nf.format(v), String(v)); }
  assert.equal(EC.brl(1.005), 'R$\u00a01,00'); assert.equal(EC.brl(1234.565), 'R$\u00a01.234,56');
});
