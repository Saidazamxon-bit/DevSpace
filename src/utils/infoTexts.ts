/** “ⓘ” tugmalari uchun bo‘limlar tavsifi */
export const INFO = {
  accounts: {
    title: 'Hisoblar nima?',
    body: [
      'Pulingiz turadigan joylar: Karta, Naqd, Jamg‘arma va o‘zingiz qo‘shgan boshqa hisoblar (masalan, Humo, dollar).',
      'Har bir daromad yoki xarajat qaysi hisobdan ekanini tanlaysiz — ilova har bir hisob qoldig‘ini alohida hisoblaydi.',
      'Kartadan naqd yechsangiz yoki jamg‘armaga pul qo‘ysangiz — “O‘tkazma” qiling. O‘tkazma daromad ham, xarajat ham hisoblanmaydi.',
      'Qoldiq haqiqatdagidan farq qilsa, hisobni tahrirlab “Hozirgi qoldiq”ni kiriting — ilova o‘zi to‘g‘rilaydi.',
    ],
  },
  budgets: {
    title: 'Budjetlar nima?',
    body: [
      'Budjet — bitta xarajat kategoriyasi uchun oylik limit. Masalan: Oziq-ovqat — 2 000 000 so‘m.',
      'Ilova shu oy qancha sarflaganingizni va qancha qolganini ko‘rsatadi.',
      'Limitning 80% iga yetganda va oshib ketganda xarajat qo‘shishingiz bilan ogohlantiradi.',
      'Har oy avtomatik qaytadan boshlanadi — qayta kiritish shart emas.',
    ],
  },
  recurring: {
    title: 'Doimiy to‘lovlar nima?',
    body: [
      'Har oy yoki har hafta takrorlanadigan daromad va xarajatlar: oylik maosh, ijara, internet, kommunal.',
      'Vaqti kelganda bosh ekranda eslatma chiqadi — bir bosishda “Qo‘shish” yoki “O‘tkazib yuborish”.',
      'Ilova o‘zi hech narsa yozmaydi — har doim siz tasdiqlaysiz, summa har oy farq qilsa ham to‘g‘ri bo‘ladi.',
      'Yangi doimiy to‘lov qo‘shish uchun xarajat yoki daromad qo‘shayotganda “Har oy” yoki “Har hafta”ni tanlang.',
    ],
  },
  categories: {
    title: 'Kategoriyalar nima?',
    body: [
      'Kategoriya — pul nimaga ketgani yoki qayerdan kelgani: Oziq-ovqat, Transport, Ish haqi va h.k.',
      'Bosh ekrandagi grafik va ro‘yxat kategoriyalar bo‘yicha hisoblanadi.',
      'O‘zingizning kategoriyalaringizni qo‘shishingiz, nomi, ikonkasi va rangini o‘zgartirishingiz mumkin.',
      'Ishlatilgan kategoriyani o‘chirsangiz, uning yozuvlari boshqa kategoriyaga ko‘chiriladi — hech narsa yo‘qolmaydi.',
    ],
  },
  transactions: {
    title: 'Tranzaksiyalar',
    body: [
      'Barcha daromad va xarajatlaringiz ro‘yxati.',
      'Davr, tur, kategoriya va hisob bo‘yicha filtrlash, qidirish mumkin.',
      'Yozuvga bosib tahrirlang yoki o‘chiring. O‘chirilgan yozuvni “Qaytarish” bilan tiklash mumkin.',
    ],
  },
} as const;

export type InfoKey = keyof typeof INFO;
