# Personal Finance

Shaxsiy moliyani boshqarish uchun **offline ishlaydigan** web-ilova (PWA). Daromad, xarajat, budjet, kategoriyalar va analitika — barchasi o‘zbek tilida. Ma’lumotlar faqat foydalanuvchining qurilmasida (IndexedDB) saqlanadi, hech qanday serverga yuborilmaydi.

## Imkoniyatlar

Pastdagi shisha (iOS “Liquid Glass” uslubidagi) tab-bar orqali 4 bo‘lim: **Asosiy · Tahlil · Hisoblar · Boshqa**.

- **Asosiy** — jami mablag‘, uning o‘zgarishi (summa va %) va chiziqli grafik (Hafta / Oy / 3 oy / Yil / Hammasi; barmoq bilan yurgizib istalgan kun qoldig‘ini ko‘rish), “Hisoblar bo‘yicha” ro‘yxat, shu oyning daromad va xarajati, oxirgi operatsiyalar. Pastda suzuvchi **− + ⇄** tugmalari: xarajat, daromad, hisoblar orasida o‘tkazma.
- **Tahlil** — Xarajatlar / Budjet / Daromadlar: kategoriyalar bo‘yicha donut (segmentga bosilsa — tafsilot), ro‘yxat, “Ko‘proq ko‘rish”, budjet holati.
- **Hisoblar** — Karta, Naqd, Jamg‘arma va o‘zingiz qo‘shgan hisoblar, qoldiqni to‘g‘rilash, o‘tkazmalar tarixi.
- **Boshqa** — tranzaksiyalar, budjetlar, doimiy to‘lovlar, kategoriyalar, sozlamalar, zaxira; har birining yonida **ⓘ** tavsif.
- Telefonda summa ilovaning o‘z raqamli klaviaturasi bilan kiritiladi, `+` va `−` bilan hisoblash mumkin (masalan, `45 000+12 000`).
- **Doimiy to‘lovlar** — “Har oy” / “Har hafta”; vaqti kelganda bosh ekranda bir bosishda tasdiqlanadi.
- **Zaxira eslatmasi** — haftada bir marta.
- **Tanishtiruv sahifasi** — brauzerda ochilganda: imkoniyatlar, 3 qadam, maxfiylik, savol-javob va “Ilovani o‘rnatish” (Chrome/Edge/Android’da brauzer ruxsat oynasi, iPhone’da yo‘riqnoma). O‘rnatilgan ilova to‘g‘ridan-to‘g‘ri ochiladi.
- **Tranzaksiyalar** — menyu, qidiruv yoki kategoriyaga bosib ochiladi: ko‘rish, tahrirlash, o‘chirish (“Qaytarish” bilan), davr/kategoriya/tur bo‘yicha filtr, qidiruv, CSV eksport.
- **Kategoriyalar** — yaratish, nom, ikonka va rangni o‘zgartirish, o‘chirish (ishlatilgan bo‘lsa, yozuvlar boshqa kategoriyaga ko‘chiriladi).
- **Budjetlar** — kategoriya bo‘yicha oylik limit, limitga yaqinlashganda ogohlantirish.
- **Sozlamalar** — Light / Dark / System mavzu, asosiy rang (yashil, ko‘k, binafsha, to‘q sariq, turkuaz, pushti, oltin), valyuta (UZS, USD, EUR, RUB), sana va son formati, boshlang‘ich balans.
- **Zaxira** — JSON zaxira, parol bilan shifrlangan zaxira (AES-256-GCM), CSV eksport, tekshiruv va “birlashtirish/almashtirish” bilan import.
- **Xavfsizlik** — PIN-kod bilan qulflash, mavjud bo‘lsa barmoq izi / Face ID.
- **PWA** — telefon va kompyuterga o‘rnatiladi, to‘liq offline ishlaydi.

> PIN-kod ilova interfeysiga kirishni cheklaydi, lekin brauzer xotirasidagi ma’lumotlarni shifrlamaydi. Qurilmaga to‘liq kirish huquqiga ega shaxsdan mutlaq himoya kafolatlanmaydi — maxfiy nusxa uchun shifrlangan zaxiradan foydalaning.

## Texnologiyalar

React 18, TypeScript, Vite, Tailwind CSS, Lucide, Dexie (IndexedDB), Zustand, vite-plugin-pwa (Workbox). Donut grafik — yengil SVG (grafik kutubxonasisiz). Shriftlar va barcha kutubxonalar lokal — tashqi CDN yoki API ishlatilmaydi.

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
  pages/        Landing, Home, Analytics (Tahlil), Accounts, More (Boshqa), Transactions, Recurring, Categories, Budgets, Settings
  layouts/      Layout va shisha tab-bar
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
