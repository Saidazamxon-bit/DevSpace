# Personal Finance

Shaxsiy moliyani boshqarish uchun **offline ishlaydigan** web-ilova (PWA). Daromad, xarajat, budjet, kategoriyalar va analitika — barchasi o‘zbek tilida. Ma’lumotlar faqat foydalanuvchining qurilmasida (IndexedDB) saqlanadi, hech qanday serverga yuborilmaydi.

## Imkoniyatlar

- **Bosh sahifa** — umumiy balans, davr bo‘yicha daromad/xarajat (bugun, hafta, oy, yil, maxsus oraliq), joriy oy natijasi, moliyaviy holat, grafiklar, oylik statistika, oxirgi operatsiyalar.
- **Tranzaksiyalar** — qo‘shish, tahrirlash, o‘chirish (“Qaytarish” imkoniyati bilan), qidiruv, tur/kategoriya/to‘lov turi/sana bo‘yicha filtr, saralash, sana bo‘yicha guruhlash, sahifalash, CSV eksport.
- **Analitika** — daromad va xarajat taqqoslanishi, oylik xarajatlar, kategoriyalar bo‘yicha taqsimot, daromad va xarajat dinamikasi, sof natija, jadval ko‘rinishi. Hammasi haqiqiy ma’lumotlardan hisoblanadi.
- **Budjetlar** — kategoriya bo‘yicha oylik limit, sarflangan/qolgan summa, foiz progress, limitga yaqinlashganda va oshganda ogohlantirish.
- **Kategoriyalar** — yaratish, tahrirlash (nom, ikonka, rang), o‘chirish. Ishlatilgan kategoriya o‘chirilganda tranzaksiyalar boshqa kategoriyaga ko‘chiriladi — ma’lumot buzilmaydi.
- **Sozlamalar** — Light / Dark / System mavzu, 7 ta aksent rang, zichlik, animatsiyalar, yon menyu, birinchi sahifa, valyuta (UZS, USD, EUR, RUB), sana va son formatlari, boshlang‘ich balans.
- **Zaxira** — to‘liq JSON zaxira, parol bilan shifrlangan zaxira (AES-256-GCM + PBKDF2), CSV eksport, tekshiruv va “birlashtirish/almashtirish” tanlovi bilan import.
- **Xavfsizlik** — PIN-kod (PBKDF2 xesh) bilan qulflash, mavjud bo‘lsa barmoq izi / Face ID (WebAuthn), avtomatik qulflash, noto‘g‘ri urinishlarda kutish.
- **PWA** — Android, iPhone va kompyuterga o‘rnatiladi, to‘liq offline ishlaydi, yangi versiya chiqqanda foydalanuvchidan so‘rab yangilanadi.

> PIN-kod ilova interfeysiga kirishni cheklaydi, lekin brauzer xotirasidagi ma’lumotlarni shifrlamaydi. Qurilmaga to‘liq kirish huquqiga ega shaxsdan mutlaq himoya kafolatlanmaydi — maxfiy nusxa uchun shifrlangan zaxiradan foydalaning.

## Texnologiyalar

React 18, TypeScript, Vite, Tailwind CSS, Lucide, Recharts, Dexie (IndexedDB), Zustand, vite-plugin-pwa (Workbox). Shriftlar va barcha kutubxonalar lokal — tashqi CDN yoki API ishlatilmaydi.

## Ishga tushirish

```bash
npm install
npm run dev        # ishlab chiqish rejimi: http://localhost:5173
npm run build      # production build → dist/
npm run preview    # build’ni lokal tekshirish: http://localhost:4173
```

Testlar:

```bash
npm test           # unit testlar (hisob-kitoblar, IndexedDB, migratsiya, import/eksport, shifrlash)
npm run build && npx vite preview --port 4173 &
npm run e2e        # brauzerda to‘liq sinov (Playwright): offline, qayta yuklash, import, PIN, mobil
```

## Joylashtirish (statik hosting / cPanel)

1. `npm run build`
2. `dist/` papkasi ichidagi **barcha** fayllarni (shu jumladan `.htaccess`) hostingga yuklang — masalan `public_html/` yoki `public_html/finance/`.
3. Sayt **HTTPS** orqali ochilishi shart (Service Worker va PWA o‘rnatish uchun; `localhost` bundan mustasno).

Ilova nisbiy yo‘llar (`base: './'`) va hash-routing ishlatadi, shuning uchun istalgan papkada server qayta yozish qoidalarisiz ishlaydi.

## Arxitektura

```
src/
  components/   UI komponentlar (ui/, charts/, settings/, forma va ro‘yxat elementlari)
  pages/        Sahifalar: Dashboard, Transactions, Analytics, Budgets, Categories, Settings
  layouts/      Desktop sidebar, mobil pastki menyu va yon panel
  hooks/        Ma’lumotlarni jonli o‘qish (useLiveQuery), mavzu, format, onlayn holat
  services/     Ma’lumotlar qatlami: finance (CRUD + validatsiya), backup, crypto, security
  database/     Dexie sxemasi, versiyalar va migratsiyalar, standart kategoriyalar
  store/        Zustand: sozlamalar (localStorage), toast, modal, qulf, PWA holati
  utils/        Pul (tiyinda butun son), sana (o‘zbekcha), statistika, ikonkalar
```

- **Pul summalari** doimo butun sonda (tiyin/sent) saqlanadi — floating-point xatolari yo‘q.
- **Balans** = boshlang‘ich balans + jami daromad − jami xarajat. **Sof natija** = daromad − xarajat. **Budjet qoldig‘i** = limit − sarflangan.
- **Migratsiyalar**: har bir sxema o‘zgarishi yangi `version(n)` sifatida qo‘shiladi, eski versiyalar o‘zgartirilmaydi; ma’lumot o‘zgarishlari bitta atomar tranzaksiyada bajariladi.
- **Sinxronlashga tayyorlik**: barcha yozuvlar UUID va `updatedAt` maydoniga ega; UI faqat `services/` orqali yozadi — kelajakda server sinxronizatsiyasini shu qatlamga qo‘shish mumkin.
- **Valyuta** almashtirilganda mavjud summalar konvertatsiya qilinmaydi (faqat ko‘rinish o‘zgaradi).
