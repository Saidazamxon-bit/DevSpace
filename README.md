# Personal Finance

Shaxsiy moliyani boshqarish uchun **offline ishlaydigan** web-ilova (PWA). Daromad, xarajat, budjet, kategoriyalar va analitika — barchasi o‘zbek tilida. Ma’lumotlar faqat foydalanuvchining qurilmasida (IndexedDB) saqlanadi, hech qanday serverga yuborilmaydi.

## Imkoniyatlar

Ilova bitta asosiy ekranga qurilgan — ochishingiz bilan pulingiz qayerga ketayotganini ko‘rasiz:

- **Bosh ekran** — davr tanlash (Bugun, Kecha, Shu hafta, Shu oy, Maxsus va ‹ › bilan oldingi/keyingi davr), markazda katta donut grafik: xarajat kategoriyalari ulushi, markazda daromad, xarajat va qoldiq. Atrofidagi kategoriya ikonkasiga bosilsa — shu kategoriyaga tez xarajat qo‘shiladi; segmentga bosilsa — kategoriya ma’lumoti chiqadi.
- **Eng tepada jami mablag‘** — bosilsa **Hisoblar** ochiladi: Karta, Naqd, Jamg‘arma va o‘zingiz qo‘shgan hisoblar, har birining qoldig‘i, hisoblar orasida **o‘tkazma**. Qoldiq farq qilsa — “Hozirgi qoldiq”ni kiriting, ilova o‘zi to‘g‘rilaydi.
- **Doimiy to‘lovlar** — qo‘shayotganda “Har oy” yoki “Har hafta”ni tanlang; vaqti kelganda bosh ekranda bir bosishda tasdiqlanadi yoki o‘tkazib yuboriladi.
- **Zaxira eslatmasi** — haftada bir marta zaxira nusxa olishni eslatadi (ma’lumot faqat qurilmada).
- Ixcham **kategoriyalar ro‘yxati** (ikonka, nom, tranzaksiyalar soni, jami summa).
- Bo‘limlar yonidagi **ⓘ** tugmasi — bo‘lim nima vazifa bajarishini tushuntiradi.
- **Tanishtiruv sahifasi** — sayt brauzerda ochilganda: “Ilovani o‘rnatish” (Chrome/Edge/Android’da brauzer ruxsat oynasi, iPhone’da qadamma-qadam yo‘riqnoma). O‘rnatilgan ilova to‘g‘ridan-to‘g‘ri ochiladi.
- Pastda ikkita katta tugma: qizil **−** xarajat, yashil **+** daromad. Telefonda summa ilovaning o‘z raqamli klaviaturasi bilan kiritiladi, `+` va `−` bilan hisoblash mumkin (masalan, `45 000+12 000`).
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
  pages/        Landing (tanishtiruv), Home (bosh ekran), Accounts, Transactions, Recurring, Categories, Budgets, Settings
  layouts/      Sodda layout va chapdan ochiladigan menyu
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
