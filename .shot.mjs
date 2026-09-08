import { chromium } from 'playwright';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1.5 });
const errs = [];
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
await p.goto('http://localhost:4173/', { waitUntil: 'networkidle' });
await p.waitForTimeout(1200);
const shots = process.argv.slice(2);
for (const s of shots) {
  if (s !== 'section') await p.getByRole('button', { name: new RegExp(s, 'i') }).first().click().catch(()=>{});
  await p.waitForTimeout(700);
  await p.screenshot({ path: `shot-${s}.png` });
}
console.log('ERRORS:', errs.length ? errs.join('\n') : 'none');
await b.close();
