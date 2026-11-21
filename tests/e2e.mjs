// Brauzerda to‘liq sinov (Playwright). Ishga tushirish:
//   npm run build && npx vite preview --port 4173 &
//   npm run e2e [screenshot-papka]
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
const norm = (s) => s.replace(/\s+/g, ' ').trim();

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, acceptDownloads: true });
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));

const balance = async () => {
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid=balance]');
    return el && !el.textContent.includes('…');
  });
  return norm(await page.locator('[data-testid=balance]').innerText());
};
const dialog = () => page.getByRole('dialog').last();

async function addTx(type, amount, category, note) {
  await page.getByRole('button', { name: type === 'income' ? 'Daromad qo‘shish' : 'Xarajat qo‘shish', exact: true }).click();
  await dialog().locator('#tx-amount').fill(amount);
  if (category) await dialog().getByRole('radiogroup', { name: 'Kategoriya' }).getByRole('radio', { name: category, exact: true }).click();
  if (note) await dialog().locator('#tx-note').fill(note);
  await dialog().getByRole('button', { name: 'Saqlash' }).click();
  await page.getByRole('dialog').waitFor({ state: 'detached' });
  await page.waitForTimeout(150);
}

// 1. Birinchi ochilish — bo‘sh holat va bitta bosh ekran
await page.goto(BASE);
await page.getByText('Hali yozuvlar yo‘q').waitFor();
check(true, 'Yangi foydalanuvchida bo‘sh holat va yo‘riqnoma ko‘rsatiladi');
check((await page.locator('[data-cat-icon]').count()) >= 10, 'Donut atrofida kategoriya ikonkalari bor');
check((await page.locator('aside, nav[aria-label="Pastki menyu"]').count()) === 0, 'Sidebar va pastki menyu yo‘q');

// 2. Boshlang‘ich balans va tranzaksiyalar (− / + tugmalari)
await page.getByRole('button', { name: /Boshlang‘ich balansni kiriting/ }).click();
await page.locator('#ib').fill('1 000 000');
await dialog().getByRole('button', { name: 'Saqlash' }).click();
await page.getByRole('dialog').waitFor({ state: 'detached' });
await addTx('income', '5000000', 'Ish haqi', 'Noyabr oyligi');
await addTx('expense', '150000,50', 'Oziq-ovqat', 'Korzinka');
// Ikonkaga bosish — kategoriya oldindan tanlangan holda tez qo‘shish
await page.locator('[data-cat-icon="exp-transport"]').click();
check(
  await dialog().locator('[role=radio][aria-label="Transport"][aria-checked="true"]').waitFor({ timeout: 3000 }).then(() => true, () => false),
  'Ikonkadan ochilganda kategoriya oldindan tanlangan',
);
await dialog().locator('#tx-amount').fill('80000');
await dialog().getByRole('button', { name: 'Saqlash' }).click();
await page.getByRole('dialog').waitFor({ state: 'detached' });
await page.waitForTimeout(300);
check((await balance()) === '5 769 999,50 so‘m', `Balans = 1 000 000 + 5 000 000 − 150 000,50 − 80 000 → ${await balance()}`);
check(norm(await page.locator('[data-testid=period-expense]').innerText()) === '−230 000,50 so‘m', 'Donut markazida davr xarajati');
check((await page.locator('main').innerText()).includes('Oziq-ovqat'), 'Kategoriyalar ro‘yxati yangilandi');
await page.screenshot({ path: `${OUT}/desktop-home.png` });

// Donut segmentini tanlash — markazda kategoriya ma’lumoti
await page.locator('svg circle[stroke="#1baf7a"]').first().dispatchEvent('click');
await page.getByRole('link', { name: 'Tranzaksiyalar ro‘yxati' }).waitFor();
check(true, 'Segment tanlanganda markazda kategoriya ma’lumoti chiqadi');
await page.getByRole('button', { name: 'Tanlovni bekor qilish' }).click();

// 3. Qayta yuklash — ma’lumotlar saqlanadi
await page.reload();
await page.locator('[data-testid=balance]').waitFor();
check((await balance()) === '5 769 999,50 so‘m', 'Sahifa qayta yuklanganda ma’lumotlar saqlanadi');

// 4. Kategoriya ro‘yxatidan tranzaksiyalar, tahrirlash va o‘chirish
await page.locator('main a[href="#/transactions?category=exp-food"]').click();
await page.getByRole('heading', { name: 'Oziq-ovqat' }).waitFor();
check((await page.locator('main').innerText()).includes('Korzinka'), 'Kategoriya bosilganda uning tranzaksiyalari ochiladi');
await page.locator('main button').filter({ hasText: 'Korzinka' }).first().click();
await dialog().locator('#tx-amount').fill('200000');
await dialog().getByRole('button', { name: 'Saqlash' }).click();
await page.getByRole('dialog').waitFor({ state: 'detached' });
check(norm(await page.locator('main').innerText()).includes('−200 000 so‘m'), 'Tranzaksiya tahrirlandi');
await page.getByRole('button', { name: /Oziq-ovqat filtrini olib tashlash/ }).click();
await page.getByPlaceholder('Izoh, kategoriya yoki summa').fill('oyligi');
await page.waitForTimeout(200);
check((await page.locator('main').innerText()).includes('Noyabr oyligi') && !(await page.locator('main').innerText()).includes('Korzinka'), 'Qidiruv ishlaydi');
await page.getByPlaceholder('Izoh, kategoriya yoki summa').fill('');
await page.locator('main button').filter({ hasText: 'Transport' }).first().click();
await dialog().getByRole('button', { name: 'O‘chirish' }).click();
await page.locator('.btn-danger').click();
await page.waitForTimeout(300);
await page.getByRole('link', { name: 'Orqaga — bosh ekran' }).click();
await page.locator('[data-testid=balance]').waitFor();
check((await balance()) === '5 800 000 so‘m', `O‘chirishdan keyin balans: ${await balance()}`);

// 5. Davr almashinuvi
await page.getByRole('radio', { name: 'Kecha' }).click();
await page.waitForTimeout(200);
check(norm(await page.locator('[data-testid=period-expense]').innerText()) === '−0 so‘m' || norm(await page.locator('[data-testid=period-expense]').innerText()) === '0 so‘m', 'Davr “Kecha” — bugungi xarajatlar hisoblanmaydi');
await page.getByRole('radio', { name: 'Shu oy' }).click();

// 6. Budjet (menyu orqali)
await page.getByRole('button', { name: 'Menyuni ochish' }).click();
await page.getByRole('dialog', { name: 'Menyu' }).getByRole('link', { name: 'Budjetlar' }).click();
await page.getByRole('button', { name: 'Birinchi budjetni qo‘shish' }).click();
await dialog().getByRole('radio', { name: 'Oziq-ovqat' }).click();
await page.locator('#b-limit').fill('250000');
await dialog().getByRole('button', { name: 'Saqlash' }).click();
await page.getByText('Limitga yaqin', { exact: true }).waitFor();
check(norm(await page.locator('main').innerText()).includes('50 000 so‘m qoldi'), 'Budjet: limit − sarflangan = qolgan, 80% ogohlantirish');

// 7. Kategoriya yaratish
await page.goto(BASE + '#/categories');
await page.getByRole('button', { name: /Yangi kategoriya/ }).click();
await page.locator('#cat-name').fill('Kafe');
await dialog().getByRole('radio', { name: 'coffee' }).click();
await dialog().getByRole('button', { name: 'Saqlash' }).click();
await page.getByText('Kategoriya yaratildi').waitFor();
check(true, 'Yangi kategoriya yaratildi');

// 8. Service Worker va offline
await page.goto(BASE);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload();
await page.waitForFunction(() => !!navigator.serviceWorker.controller);
await ctx.setOffline(true);
await page.reload();
await page.locator('[data-testid=balance]').waitFor();
check((await balance()) === '5 800 000 so‘m', 'Internet uzilganda ilova ochiladi va ma’lumotlar o‘qiladi');
check(await page.getByText('Offline rejim').isVisible(), 'Offline belgisi ko‘rsatiladi');
await addTx('expense', '1000', 'Kafe', 'Offline qahva');
check((await balance()) === '5 799 000 so‘m', 'Offline rejimda tranzaksiya qo‘shiladi (yangi kategoriya ham ishlaydi)');
await page.goto(BASE + '#/transactions');
await page.getByText('Offline qahva').waitFor();
check(true, 'Offline rejimda boshqa sahifalar ham ochiladi');
await ctx.setOffline(false);

// 9. Sozlamalar saqlanadi
await page.goto(BASE + '#/settings');
await page.getByRole('radio', { name: /Qorong‘i/ }).click();
await page.getByRole('radio', { name: 'Binafsha' }).click();
await page.reload();
await page.getByText('Ko‘rinish').first().waitFor();
const html = await page.evaluate(() => ({ dark: document.documentElement.classList.contains('dark'), accent: document.documentElement.dataset.accent }));
check(html.dark && html.accent === 'violet', 'Mavzu va rang qayta ochilganda tiklanadi');
await page.getByRole('radio', { name: /Yorug‘/ }).click();
await page.getByRole('radio', { name: 'Yashil' }).click();

// 10. Eksport → o‘chirish → import
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
await page.getByText('Hali yozuvlar yo‘q').waitFor();
check(true, 'Barcha ma’lumotlar o‘chirildi');
await page.goto(BASE + '#/settings');
await page.getByRole('button', { name: /Zaxiradan tiklash/ }).click();
await page.locator('input[type=file]').setInputFiles(file);
await page.getByText('Fayl tekshirildi').waitFor();
await page.getByRole('radio', { name: /Almashtirish/ }).click();
await dialog().getByRole('button', { name: 'Almashtirish', exact: true }).click();
await dialog().getByRole('button', { name: 'Almashtirish', exact: true }).click();
await page.getByText('Zaxira muvaffaqiyatli tiklandi').waitFor({ timeout: 8000 });
await page.goto(BASE);
await page.locator('[data-testid=balance]').waitFor();
check((await balance()) === '5 799 000 so‘m', `JSON importdan keyin balans tiklandi: ${await balance()}`);

// 11. PIN qulf
await page.goto(BASE + '#/settings');
await page.getByRole('switch', { name: /PIN-kod bilan qulflash/ }).click();
for (const d of '12341234') await dialog().getByRole('button', { name: d, exact: true }).click();
await page.getByText('PIN-kod o‘rnatildi').waitFor();
await page.reload();
await page.getByText('PIN-kodni kiriting').waitFor();
check(true, 'PIN o‘rnatilgandan keyin ilova qulflanadi');
for (const d of '9999') await page.getByRole('button', { name: d, exact: true }).click();
await page.getByText('PIN noto‘g‘ri').waitFor({ timeout: 6000 });
for (const d of '1234') await page.getByRole('button', { name: d, exact: true }).click();
await page.getByRole('heading', { name: 'Sozlamalar', exact: true }).waitFor({ timeout: 8000 });
check(true, 'Noto‘g‘ri PIN rad etiladi, to‘g‘risi bilan ochiladi');
await page.getByRole('switch', { name: /PIN-kod bilan qulflash/ }).click();
await page.getByRole('button', { name: 'O‘chirish', exact: true }).click();

// 12. Mobil: ilova klaviaturasi, gorizontal scroll yo‘q
const mctx = await browser.newContext({ ...devices['iPhone 13'] });
const m = await mctx.newPage();
m.on('pageerror', (e) => errors.push(e.message));
await m.goto(BASE);
await m.getByText('Hali yozuvlar yo‘q').waitFor();
const pad = async (str) => {
  for (const ch of str) await m.locator(`[data-numpad] [data-key="${ch === ',' ? 'dec' : ch}"]`).click();
};
await m.getByRole('button', { name: 'Xarajat qo‘shish', exact: true }).click();
check(await m.locator('[data-numpad]').isVisible(), 'Mobil: ilovaning o‘z klaviaturasi ochildi');
check((await m.locator('#tx-amount').getAttribute('inputmode')) === 'none', 'Mobil: tizim klaviaturasi o‘chirilgan');
await pad('45');
await m.locator('[data-numpad] [data-key="000"]').click();
check((await m.locator('#tx-amount').inputValue()) === '45 000', `Mobil klaviatura: 4,5,000 → ${await m.locator('#tx-amount').inputValue()}`);
await m.getByRole('button', { name: 'Tayyor' }).click();
await m.getByRole('dialog').getByRole('radio', { name: 'Transport', exact: true }).click();
await m.getByRole('dialog').getByRole('button', { name: 'Saqlash' }).click();
await m.getByRole('dialog').waitFor({ state: 'detached' });
await m.getByRole('button', { name: 'Daromad qo‘shish', exact: true }).click();
await pad('32');
await m.locator('[data-numpad] [data-key="000"]').click();
await m.locator('[data-numpad] [data-key="000"]').click();
await m.getByRole('dialog').getByRole('radio', { name: 'Freelance', exact: true }).click();
await m.getByRole('dialog').getByRole('button', { name: 'Saqlash' }).click();
await m.getByRole('dialog').waitFor({ state: 'detached' });
await m.waitForTimeout(400);
check(norm(await m.locator('[data-testid=balance]').innerText()) === '31 955 000 so‘m', `Mobil: balans (32 000 000 − 45 000) ${norm(await m.locator('[data-testid=balance]').innerText())}`);
const box = await m.locator('[data-testid=balance-panel]').boundingBox();
const btn = await m.getByRole('button', { name: 'Xarajat qo‘shish', exact: true }).boundingBox();
check(box && btn && box.y + box.height <= btn.y, 'Mobil: balans birinchi ekranda, −/+ tugmalari uni yopmaydi');
for (const [path, name] of [['', 'home'], ['#/transactions', 'transactions'], ['#/categories', 'categories'], ['#/budgets', 'budgets'], ['#/settings', 'settings']]) {
  await m.goto(BASE + path);
  await m.waitForTimeout(500);
  const over = await m.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check(over <= 0, `Mobil (${name}): gorizontal scroll yo‘q (${over}px)`);
  await m.screenshot({ path: `${OUT}/mobile-${name}.png` });
}

const relevant = errors.filter((e) => !/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(e));
check(relevant.length === 0, `Konsolda xatolar yo‘q${relevant.length ? ': ' + relevant.join(' | ') : ''}`);

await browser.close();
console.log(failures ? `\n${failures} ta tekshiruv muvaffaqiyatsiz` : '\nBarcha tekshiruvlar o‘tdi');
process.exit(failures ? 1 : 0);
