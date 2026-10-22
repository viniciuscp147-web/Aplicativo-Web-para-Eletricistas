// Teste de interface no Chromium real (Playwright). Uso: node tests/ui-smoke.js
const { chromium } = require('playwright'); const path = require('path'); const assert = require('assert');
(async () => {
  const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 390, height: 800 } }), errs = [];
  pg.on('pageerror', e => errs.push(e.message)); pg.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await pg.goto('file://' + path.resolve(__dirname, '../index.html'));
  const t = s => pg.locator(s).innerText();
  // 1) Queda de tensão (padrão do app: 30 m, 2,5 mm², 16 A, 220 V)
  let r = await t('#res'); assert(/3,67%/.test(r) && /8,06 V/.test(r) && /Em Conformidade NBR 5410/.test(r), r);
  await pg.fill('[data-b="vd.dist"]', '80'); r = await t('#res'); assert(/Queda Excessiva/.test(r) && /mínimo 10,0 mm²/.test(r), r);
  await pg.click('[data-do="vdt"][data-v="tri"]'); assert(/k = √3/.test(await t('#view')));
  // 2) Potência: 3500 W / 220 V -> 15,91 A -> 1,5 mm² (17,5A; regra original: 1ª bitola com capacidade >= corrente) -> leva 15.9 A para a queda de tensão
  await pg.click('nav [data-v="pw"]'); r = await t('#res'); assert(/15,91 A/.test(r) && /1,5 mm² \(suporta até 17.5A\)/.test(r) && /Disjuntor sugerido: 10A/.test(r), r);
  await pg.click('[data-do="pw2vd"]'); assert.equal(await pg.inputValue('[data-b="vd.cur"]'), '15.9');
  // 3) Cabos: 250 m a R$ 4,55 com 5% de desconto em rolos = R$ 1.092,00
  await pg.click('nav [data-v="cab"]'); await pg.fill('[data-b="cab.m"]', '250'); r = await t('#res');
  assert(/R\$\s1\.092,00/.test(r) && /2 rolo\(s\) de 100m \+ 50m fracionados/.test(r) && /6\.00 kg/.test(r), r);
  await pg.click('[data-do="addm"][data-v="-10"]'); assert.equal(await pg.inputValue('[data-b="cab.m"]'), '240');
  // 4) Trocar fornecedor (Prysmian) e adicionar ao orçamento
  await pg.selectOption('[data-t]', 'table_prysmian_w43_2026'); assert(/R\$\s4,85\/m/.test(await t('#res')));
  await pg.click('[data-do="addb"]'); await pg.click('nav [data-v="bud"]');
  r = await t('#view'); assert(/1 item adicionado/.test(r) && /Cabo 2,5 mm² - Azul Claro/.test(r), r);
  await pg.fill('[data-b="margin"]', '10'); await pg.evaluate(() => document.querySelector('[data-b="margin"]').dispatchEvent(new Event('input', { bubbles: true })));
  assert(/\+10%/.test(await t('#lm')));
  // 5) Responsivo: sem rolagem horizontal no celular e erros de console
  assert(await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'rolagem horizontal');
  await pg.screenshot({ path: '/tmp/ui-mobile.png' });
  await pg.setViewportSize({ width: 1280, height: 800 }); await pg.click('nav [data-v="vd"]'); await pg.screenshot({ path: '/tmp/ui-desktop.png' });
  assert.deepEqual(errs, [], 'erros de console: ' + errs.join(' | ')); console.log('UI OK — 5 fluxos verificados, 0 erros de console'); await b.close();
})().catch(e => { console.error('FALHOU:', e.message); process.exit(1); });
