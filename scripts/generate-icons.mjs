// PWA ikonkalarini SVG dan PNG ga aylantirish (Playwright Chromium orqali). Ishga tushirish: npm run icons
import { createRequire } from 'node:module';
// Playwright loyiha bog‘liqligi emas — global o‘rnatilganidan foydalaniladi (NODE_PATH)
const { chromium } = createRequire(import.meta.url)('playwright');
import { writeFileSync, mkdirSync } from 'node:fs';

const art = (pad) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx="0.85" cy="0" r="1"><stop offset="0" stop-color="#3B82F6" stop-opacity=".95"/><stop offset=".62" stop-color="#3B82F6" stop-opacity="0"/></radialGradient>
    <radialGradient id="g2" cx="0" cy="1" r=".8"><stop offset="0" stop-color="#3B82F6" stop-opacity=".35"/><stop offset="1" stop-color="#3B82F6" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#0D0F14"/>
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="url(#g)"/>
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="url(#g2)"/>
  <g transform="translate(256 256) scale(${pad ? 0.72 : 1}) translate(-256 -256)">
    <rect x="128" y="160" width="256" height="196" rx="44" fill="none" stroke="#fff" stroke-width="26"/>
    <path d="M128 222h256" stroke="#fff" stroke-width="26"/>
    <circle cx="322" cy="292" r="22" fill="#fff"/>
  </g>
</svg>`;

const targets = [
  ['icon-192.png', 192, false],
  ['icon-512.png', 512, false],
  ['maskable-512.png', 512, true],
  ['apple-touch-icon.png', 180, true],
];

mkdirSync('public/icons', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size, pad] of targets) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<html><body style="margin:0;background:transparent">${art(pad).replace('<svg ', `<svg width="${size}" height="${size}" `)}</body></html>`);
  const buf = await page.screenshot({ omitBackground: !pad, clip: { x: 0, y: 0, width: size, height: size } });
  writeFileSync(`public/icons/${name}`, buf);
  console.log('✓', name);
}
await browser.close();
