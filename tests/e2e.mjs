// Brauzerda to‘liq sinov (Playwright). Ishga tushirish:
//   npm run build && npx vite preview --port 4173 &
//   NODE_PATH=/opt/node-tools/node_modules node tests/e2e.mjs [screenshot-papka]
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';

const { chromium, devices } = createRequire(import.meta.url)('playwright');
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/';
const OUT = process.argv[2] ?? 'test-results';
mkdirSync(OUT, { recursive: true });

let failures = 0;
const check = (cond, msg) => {
  console.log(`${cond ? '✓' : '✗'} ${msg}`);
  if (!cond) failures++;
};

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const text = async (sel) => (await page.locator(sel).first().innerText()).replace(/\s+/g, ' ');
const balance = () => page.locator('[data-testid=balance]').first().innerText().then((s) => s.replace(/\s+/g, ' '));

async function addTx(type, amount, category, note) {
  await page.getByRole('button', { name: type === 'income' ? 'Daromad' : 'Xarajat', exact: true }).first().click();
  const dlg = page.getByRole('dialog');
  await dlg.locator('#tx-amount').fill(amount);
  await dlg.getByRole('radiogroup', { name: 'Kategoriya' }).getByRole('radio', { name: category }).click();
  if (note) await dlg.locator('#tx-note').fill(note);
  await dlg.getByRole('button', { name: 'Saqlash' }).click();
  await dlg.waitFor({ state: 'detached' });
}

// 1. Birinchi ochilish — bo‘sh holat
await page.goto(BASE);
await page.getByText('Personal Finance’ga xush kelibsiz!').waitFor();
check(await page.getByRole('heading', { name: 'Hali operatsiyalar yo‘q' }).isVisible(), 'Yangi foydalanuvchida bo‘sh holat va yo‘riqnoma ko‘rsatiladi');
check((await balance()).includes('0'), `Boshlang‘ich balans 0: ${await balance()}`);

// 2. Boshlang‘ich balans va tranzaksiyalar
await page.getByRole('button', { name: 'Kiritish' }).click();
await page.locator('#ib').fill('1 000 000');
await page.getByRole('dialog').getByRole('button', { name: 'Saqlash' }).click();
await page.getByRole('dialog').waitFor({ state: 'detached' });
await addTx('income', '5000000', 'Ish haqi', 'Noyabr oyligi');
await addTx('expense', '150000,50', 'Oziq-ovqat', 'Korzinka');
await addTx('expense', '80000', 'Transport');
await page.waitForTimeout(300);
const b1 = await balance();
check(b1 === '5 769 999,50 so‘m', `Balans = 1 000 000 + 5 000 000 − 150 000,50 − 80 000 → ${b1}`);
await page.screenshot({ path: `${OUT}/desktop-dashboard-light.png` });

// 3. Qayta yuklash — ma’lumotlar saqlanadi
await page.reload();
await page.locator('[data-testid=balance]').waitFor();
check((await balance()) === b1, 'Sahifa qayta yuklanganda ma’lumotlar saqlanadi');

// 4. Tahrirlash va o‘chirish
await page.goto(BASE + '#/transactions');
await page.locator('main button').filter({ hasText: 'Korzinka' }).first().click();
await page.locator('#tx-amount').fill('200000');
await page.getByRole('dialog').getByRole('button', { name: 'Saqlash' }).click();
await page.getByRole('dialog').waitFor({ state: 'detached' });
await page.getByText('Korzinka').waitFor();
check((await text('main')).includes('−200 000 so‘m'), 'Tranzaksiya tahrirlandi');
await page.getByPlaceholder('Izoh, kategoriya yoki summa bo‘yicha qidirish').fill('transport');
await page.waitForTimeout(200);
check((await page.locator('main').getByText('Noyabr oyligi').count()) === 0, 'Qidiruv filtrlaydi');
await page.getByPlaceholder('Izoh, kategoriya yoki summa bo‘yicha qidirish').fill('');
await page.screenshot({ path: `${OUT}/desktop-transactions.png` });
await page.locator('main button').filter({ hasText: 'Transport' }).first().click();
await page.getByRole('dialog').getByRole('button', { name: /O‘chirish/ }).click();
await page.getByRole('dialog').last().locator('.btn-danger').click();
await page.waitForTimeout(400);
await page.goto(BASE);
await page.locator('[data-testid=balance]').waitFor();
check((await balance()) === '5 800 000 so‘m', `O‘chirishdan keyin balans: ${await balance()}`);

// 5. Budjet
await page.goto(BASE + '#/budgets');
await page.getByRole('button', { name: 'Birinchi budjetni qo‘shish' }).click();
await page.getByRole('dialog').getByRole('radio', { name: 'Oziq-ovqat' }).click();
await page.locator('#b-limit').fill('250000');
await page.getByRole('dialog').getByRole('button', { name: 'Saqlash' }).click();
await page.getByText('Limitga yaqin', { exact: true }).waitFor();
const btxt = await text('main');
check(btxt.includes('50 000 so‘m qoldi') && btxt.includes('80%'), `Budjet: limit − sarflangan = qolgan, 80% ogohlantirish${btxt.includes('qoldi') ? '' : ' :: ' + btxt.slice(0, 400)}`);

// 6. Analitika (haqiqiy ma’lumotdan)
await page.goto(BASE + '#/analytics');
await page.getByText('Daromad va xarajat taqqoslanishi').waitFor();
check((await page.locator('.recharts-surface').count()) >= 4, 'Analitika grafiklari chiziladi');
await page.screenshot({ path: `${OUT}/desktop-analytics.png`, fullPage: true });

// 7. Service Worker va offline
await page.goto(BASE);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await page.waitForFunction(() => !!navigator.serviceWorker.controller);
check(true, 'Service Worker faol');
await ctx.setOffline(true);
await page.reload();
await page.locator('[data-testid=balance]').waitFor();
check((await balance()) === '5 800 000 so‘m', 'Internet uzilganda ilova ochiladi va ma’lumotlar o‘qiladi');
check(await page.getByText('Offline rejim').locator('visible=true').first().isVisible(), 'Offline belgisi ko‘rsatiladi');
await addTx('expense', '1000', 'Boshqa', 'Offline xarajat');
await page.waitForTimeout(300);
check((await balance()) === '5 799 000 so‘m', 'Offline rejimda tranzaksiya qo‘shiladi');
await page.goto(BASE + '#/analytics');
await page.getByText('Sof moliyaviy natija').waitFor();
check(true, 'Offline rejimda lazy sahifalar (analitika) ham ochiladi');
await ctx.setOffline(false);

// 8. Sozlamalar saqlanadi
await page.goto(BASE + '#/settings');
await page.getByRole('radio', { name: /Qorong‘i/ }).first().click();
await page.getByRole('radio', { name: 'Oltin' }).click();
await page.reload();
await page.getByText('Tashqi ko‘rinish').waitFor();
const html = await page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), accent: document.documentElement.dataset.accent }));
check(html.dark && html.accent === 'gold', 'Mavzu va rang qayta ochilganda tiklanadi');
await page.goto(BASE);
await page.locator('[data-testid=balance]').waitFor();
await page.waitForTimeout(300);
await page.screenshot({ path: `${OUT}/desktop-dashboard-dark-gold.png` });

// 9. Eksport → o‘chirish → import
await page.goto(BASE + '#/settings');
const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /JSON zaxira/ }).click()]);
const file = `${OUT}/backup.json`;
await dl.saveAs(file);
const backup = JSON.parse(readFileSync(file, 'utf-8'));
check(backup.app === 'personal-finance' && backup.data.transactions.length === 3, `JSON eksport: ${backup.data.transactions.length} ta tranzaksiya`);
const [csvDl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /CSV eksport/ }).click()]);
await csvDl.saveAs(`${OUT}/tx.csv`);
check(readFileSync(`${OUT}/tx.csv`, 'utf-8').split('\n').length === 4, 'CSV eksport');

await page.getByRole('button', { name: 'Barcha ma’lumotlarni o‘chirish' }).click();
await page.getByRole('button', { name: 'Ha, hammasini o‘chirish' }).click();
await page.waitForTimeout(300);
await page.goto(BASE);
await page.locator('[data-testid=balance]').waitFor();
check((await balance()) === '0 so‘m', 'Barcha ma’lumotlar o‘chirildi');

await page.goto(BASE + '#/settings');
await page.getByRole('button', { name: /Zaxiradan tiklash/ }).click();
await page.locator('input[type=file]').setInputFiles(file);
await page.getByText('Fayl tekshirildi').waitFor();
await page.getByRole('radio', { name: /Almashtirish/ }).click();
await page.getByRole('dialog').getByRole('button', { name: 'Almashtirish', exact: true }).click();
await page.getByRole('dialog').last().getByRole('button', { name: 'Almashtirish', exact: true }).click();
await page.getByText('Zaxira muvaffaqiyatli tiklandi').waitFor({ timeout: 8000 });
await page.goto(BASE);
await page.locator('[data-testid=balance]').waitFor();
check((await balance()) === '5 799 000 so‘m', 'JSON importdan keyin balans tiklandi');

// 10. PIN qulf
await page.goto(BASE + '#/settings');
await page.getByRole('switch', { name: /PIN-kod bilan qulflash/ }).click();
for (const d of '1234') await page.getByRole('dialog').getByRole('button', { name: d, exact: true }).click();
for (const d of '1234') await page.getByRole('dialog').getByRole('button', { name: d, exact: true }).click();
await page.getByText('PIN-kod o‘rnatildi').waitFor();
await page.reload();
await page.getByText('PIN-kodni kiriting').waitFor();
check(await page.getByLabel('Ilova qulflangan').isVisible(), 'PIN o‘rnatilgandan keyin ilova qulflanadi');
for (const d of '9999') await page.getByRole('button', { name: d, exact: true }).click();
await page.getByText('PIN noto‘g‘ri').waitFor({ timeout: 6000 });
check(true, 'Noto‘g‘ri PIN rad etiladi');
for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click();
await page.getByRole('heading', { name: 'Sozlamalar', exact: true }).waitFor({ timeout: 8000 });
check(true, 'To‘g‘ri PIN bilan ochiladi');
await page.goto(BASE + '#/settings');
await page.getByRole('switch', { name: /PIN-kod bilan qulflash/ }).click();
await page.getByRole('button', { name: 'O‘chirish', exact: true }).click();

// 11. Mobil ko‘rinish — gorizontal scroll yo‘q
const mctx = await browser.newContext({ ...devices['iPhone 13'] });
const m = await mctx.newPage();
m.on('pageerror', (e) => errors.push(e.message));
await m.goto(BASE);
await m.getByText('Personal Finance’ga xush kelibsiz!').waitFor();
// Mobil formadan qo‘shish
await m.getByRole('button', { name: 'Tranzaksiya qo‘shish' }).last().click();
check(await m.locator('[data-numpad]').isVisible(), 'Mobil: ilovaning o‘z klaviaturasi ochildi');
check((await m.locator('#tx-amount').getAttribute('inputmode')) === 'none', 'Mobil: tizim klaviaturasi o‘chirilgan (inputmode=none)');
const pad = async (str) => { for (const ch of str) await m.locator(`[data-numpad] [data-key="${ch === ',' ? 'dec' : ch}"]`).click(); };
await pad('45');
await m.locator('[data-numpad] [data-key="000"]').click();
check((await m.locator('#tx-amount').inputValue()) === '45 000', `Mobil klaviatura: 4,5,000 → ${await m.locator('#tx-amount').inputValue()}`);
await m.getByRole('button', { name: 'Tayyor' }).click();
check(!(await m.locator('[data-numpad]').isVisible()), 'Mobil: “Tayyor” klaviaturani yopadi');
await m.getByRole('dialog').getByRole('radio', { name: 'Transport' }).click();
await m.getByRole('dialog').getByRole('button', { name: 'Saqlash' }).click();
await m.getByRole('dialog').waitFor({ state: 'detached' });
await m.getByRole('button', { name: 'Tranzaksiya qo‘shish' }).last().click();
await m.getByRole('dialog').getByRole('radio', { name: 'Daromad' }).click();
await m.locator('#tx-amount').click();
await pad('32');
await m.locator('[data-numpad] [data-key="000"]').click();
await m.locator('[data-numpad] [data-key="000"]').click();
await m.getByRole('dialog').getByRole('radio', { name: 'Freelance' }).click();
await m.getByRole('dialog').getByRole('button', { name: 'Saqlash' }).click();
await m.getByRole('dialog').waitFor({ state: 'detached' });
await m.waitForTimeout(400);
for (const [path, name] of [['', 'dashboard'], ['#/transactions', 'transactions'], ['#/analytics', 'analytics'], ['#/budgets', 'budgets'], ['#/categories', 'categories'], ['#/settings', 'settings']]) {
  await m.goto(BASE + path);
  await m.waitForTimeout(600);
  const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(over <= 0, `Mobil (${name}): gorizontal scroll yo‘q (${over}px)`);
  await m.screenshot({ path: `${OUT}/mobile-${name}.png` });
}
await m.goto(BASE);
await m.getByRole('button', { name: 'Tranzaksiya qo‘shish' }).last().click();
await m.waitForTimeout(400);
await m.screenshot({ path: `${OUT}/mobile-add-form.png` });

const relevant = errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
check(relevant.length === 0, `Konsolda xatolar yo‘q${relevant.length ? ': ' + relevant.join(' | ') : ''}`);

await browser.close();
console.log(failures ? `\n${failures} ta tekshiruv muvaffaqiyatsiz` : '\nBarcha tekshiruvlar o‘tdi');
process.exit(failures ? 1 : 0);
