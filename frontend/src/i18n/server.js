// Translates messages produced by the backend (PHP API or the demo API) into Uzbek.
// The backend speaks English; patterns below cover every message it can generate.

const ENTITY = {
  project: ['Loyiha', 'loyiha'], task: ['Vazifa', 'vazifa'], domain: ['Domen', 'domen'], server: ['Server', 'server'],
  monitor: ['Monitor', 'monitor'], credential: ['Kalit', 'kalit'], expense: ['Xarajat', 'xarajat'],
  'expense category': ['Xarajat toifasi', 'xarajat toifasi'], category: ['Toifa', 'toifa'], snippet: ['Snippet', 'snippet'],
  settings: ['Sozlamalar', 'sozlamalar'], backup: ['Zaxira nusxa', 'zaxira nusxa'], auth: ['Kirish', 'kirish'], account: ['Akkaunt', 'akkaunt'],
};
const ent = (e, i = 1) => (ENTITY[e] ? ENTITY[e][i] : e);
const STATUS = { 'in progress': 'Jarayonda', todo: 'Bajarilishi kerak', review: 'Tekshiruvda', done: 'Bajarildi' };
const PRIO = { Low: 'Past', Medium: "O'rta", High: 'Yuqori', Critical: 'Kritik' };
const ACTION = { Created: 'yaratildi', Updated: 'yangilandi', Deleted: "o'chirildi" };
const plural = (n) => n; // Uzbek nouns don't change after numbers

const RULES = [
  // ---- activity log ----
  [/^(Created|Updated|Deleted) (expense category|project|task|domain|server|monitor|credential|expense|snippet) “(.*)”$/, (m) => `${ent(m[2], 0)} “${m[3]}” ${ACTION[m[1]]}`],
  [/^Completed task “(.*)”$/, (m) => `“${m[1]}” vazifasi bajarildi`],
  [/^Moved task “(.*)” to (.+)$/, (m) => `“${m[1]}” vazifasi “${STATUS[m[2]] || m[2]}” ustuniga o'tkazildi`],
  [/^Archived project “(.*)”$/, (m) => `“${m[1]}” loyihasi arxivlandi`],
  [/^Restored project “(.*)”$/, (m) => `“${m[1]}” loyihasi tiklandi`],
  [/^Revealed secret “(.*)” \((.*)\)$/, (m) => `“${m[1]}” (${m[2]}) kaliti ochildi`],
  [/^(.+) is down: (.+)$/, (m) => `${m[1]} ishlamayapti: ${tx(m[2])}`],
  [/^(.+) recovered after (\d+) min$/, (m) => `${m[1]} ${m[2]} daqiqadan keyin tiklandi`],
  [/^Signed in from (.+)$/, (m) => `${m[1]} manzilidan tizimga kirildi`],
  [/^Signed out$/, () => 'Tizimdan chiqildi'],
  [/^Account created$/, () => 'Akkaunt yaratildi'],
  [/^Updated profile$/, () => 'Profil yangilandi'],
  [/^Changed account password$/, () => "Akkaunt paroli o'zgartirildi"],
  [/^Updated preferences$/, () => 'Sozlamalar yangilandi'],
  [/^Exported account data$/, () => "Akkaunt ma'lumotlari eksport qilindi"],
  [/^Created database backup (.+)$/, (m) => `Bazaning zaxira nusxasi yaratildi: ${m[1]}`],
  [/^Downloaded backup (.+)$/, (m) => `Zaxira nusxa yuklab olindi: ${m[1]}`],
  [/^Deleted backup (.+)$/, (m) => `Zaxira nusxa o'chirildi: ${m[1]}`],

  // ---- timeline titles / subtitles ----
  [/^New (.+)$/, (m) => `Yangi ${ent(m[1])}`],
  [/^(Project|Task|Domain|Server|Monitor|Credential|Expense|Snippet|Settings|Backup|Expense category) updated$/, (m) => `${ent(m[1].toLowerCase(), 0)} yangilandi`],
  [/^(Project|Task|Domain|Server|Monitor|Credential|Expense|Snippet|Backup|Expense category) removed$/, (m) => `${ent(m[1].toLowerCase(), 0)} o'chirildi`],
  [/^Task completed$/, () => 'Vazifa bajarildi'],
  [/^Project archived$/, () => 'Loyiha arxivlandi'],
  [/^Project restored$/, () => 'Loyiha tiklandi'],
  [/^Incident$/, () => 'Nosozlik'],
  [/^Recovered$/, () => 'Tiklandi'],
  [/^Secret revealed$/, () => 'Kalit ochildi'],
  [/^Project deadline$/, () => 'Loyiha muddati'],
  [/^Domain renewal due$/, () => 'Domenni yangilash vaqti'],
  [/^Certificate expires$/, () => 'Sertifikat muddati tugaydi'],
  [/^(.+) deadline$/, (m) => `${m[1]} — muddat`],
  [/^SSL · (.+)$/, (m) => `SSL · ${m[1]}`],
  [/^(.+) expires$/, (m) => `${m[1]} muddati tugaydi`],
  [/^(.*?)(Low|Medium|High|Critical) priority$/, (m) => `${m[1]}${PRIO[m[2]]} ustuvorlik`],

  // ---- insights details ----
  [/^Maintenance$/, () => 'Texnik xizmatda'],
  [/^Offline$/, () => 'Oflayn'],
  [/^Down · (.+)$/, (m) => `Ishlamayapti · ${tx(m[1])}`],
  [/^Slow · avg (\d+) ms \(24h\)$/, (m) => `Sekin · o'rtacha ${m[1]} ms (24 soat)`],

  // ---- notifications ----
  [/^Domain (.+) expires in (\d+) days?$/, (m) => `${m[1]} domeni ${m[2]} kundan keyin tugaydi`],
  [/^Domain (.+) has expired$/, (m) => `${m[1]} domenining muddati tugagan`],
  [/^SSL for (.+) expires in (\d+) days?$/, (m) => `${m[1]} SSL sertifikati ${m[2]} kundan keyin tugaydi`],
  [/^SSL certificate for (.+) has expired$/, (m) => `${m[1]} SSL sertifikatining muddati tugagan`],
  [/^Overdue: (.+)$/, (m) => `Muddati o'tgan: ${m[1]}`],
  [/^Due today: (.+)$/, (m) => `Bugun muddati: ${m[1]}`],
  [/^Project deadline: (.+)$/, (m) => `Loyiha muddati: ${m[1]}`],
  [/^API key “(.*)” \((.*)\) expires soon$/, (m) => `“${m[1]}” (${m[2]}) API kalitining muddati yaqinda tugaydi`],
  [/^(.+) is down$/, (m) => `${m[1]} ishlamayapti`],
  [/^(.+) is back up$/, (m) => `${m[1]} yana ishlayapti`],
  [/^Expiration date: (.+)$/, (m) => `Tugash sanasi: ${m[1]}`],
  [/^Certificate valid until (.+)$/, (m) => `Sertifikat amal qiladi: ${m[1]} gacha`],
  [/^Due date: (.+)$/, (m) => `Muddat: ${m[1]}`],
  [/^Due in (\d+) day\(s\) — (.+)$/, (m) => `${m[1]} kundan keyin — ${m[2]}`],
  [/^Due today$/, () => 'Bugun'],
  [/^Downtime lasted about (\d+) minute\(s\)\.$/, (m) => `Uzilish taxminan ${m[1]} daqiqa davom etdi.`],
  [/^(HTTP \d+|No response|Operation timed out.*) — (.+)$/, (m) => `${tx(m[1])} — ${m[2]}`],

  // ---- errors & validation ----
  [/^These credentials do not match our records\.$/, () => "Email yoki parol noto'g'ri."],
  [/^Invalid email or password\.$/, () => "Email yoki parol noto'g'ri."],
  [/^Too many login attempts\. Try again in (\d+) minute\(s\)\.$/, (m) => `Juda ko'p urinish. ${m[1]} daqiqadan keyin qayta urinib ko'ring.`],
  [/^Too many attempts\. Try again in (\d+) minute\(s\)\.$/, (m) => `Juda ko'p urinish. ${m[1]} daqiqadan keyin qayta urinib ko'ring.`],
  [/^Your session has expired\. Please reload the page\.$/, () => 'Sessiya muddati tugadi. Sahifani yangilang.'],
  [/^Authentication required\.$/, () => 'Tizimga kirish talab qilinadi.'],
  [/^Please correct the highlighted fields\.$/, () => "Belgilangan maydonlarni to'g'rilang."],
  [/^Administrator access required\.$/, () => 'Administrator huquqi talab qilinadi.'],
  [/^You are not allowed to do that\.$/, () => "Bunga ruxsatingiz yo'q."],
  [/^Incorrect password\.$/, () => "Parol noto'g'ri."],
  [/^Current password is incorrect\.$/, () => "Joriy parol noto'g'ri."],
  [/^Passwords do not match\.$/, () => 'Parollar mos kelmadi.'],
  [/^Use at least one letter and one number\.$/, () => 'Kamida bitta harf va bitta raqam ishlating.'],
  [/^This email is already in use\.$/, () => 'Bu email allaqachon ishlatilmoqda.'],
  [/^This domain is already in your list\.$/, () => "Bu domen ro'yxatingizda bor."],
  [/^A category with this name already exists\.$/, () => 'Bunday nomli toifa allaqachon mavjud.'],
  [/^(.+) not found\.$/, () => 'Topilmadi.'],
  [/^Endpoint not found\.$/, () => 'Manzil topilmadi.'],
  [/^Network error — check your connection\.$/, () => 'Tarmoq xatosi — internet aloqasini tekshiring.'],
  [/^Something went wrong\. The error has been logged\.$/, () => "Xatolik yuz berdi. U jurnalga yozildi."],
  [/^A database error occurred\.$/, () => "Ma'lumotlar bazasida xatolik yuz berdi."],
  [/^Could not read an SSL certificate from (.+)\.$/, (m) => `${m[1]} manzilidan SSL sertifikatini o'qib bo'lmadi.`],
  [/^This secret could not be decrypted\. Check APP_KEY\.$/, () => "Kalitni deshifrlab bo'lmadi. APP_KEY ni tekshiring."],
  [/^(.+) needs the PHP backend — this is a static demo\.$/, (m) => `${DEMO_FEATURE[m[1]] || m[1]} uchun PHP backend kerak — bu statik demo.`],
  [/^Request failed \((\d+)\)$/, (m) => `So'rov bajarilmadi (${m[1]})`],
  [/^Method not allowed\.$/, () => 'Bu amal ruxsat etilmagan.'],
  [/ is required\.$/, () => 'Bu maydon majburiy.'],
  [/ must be a valid http\(s\) URL\.$/, () => "http:// yoki https:// bilan boshlanadigan to'g'ri manzil kiriting."],
  [/ must be a valid email address\.$/, () => "To'g'ri email kiriting."],
  [/ must be a valid date \(YYYY-MM-DD\)\.$/, () => "To'g'ri sana kiriting."],
  [/ must be a valid time \(HH:MM\)\.$/, () => "To'g'ri vaqt kiriting (SS:DD)."],
  [/ must be a valid IP address\.$/, () => "To'g'ri IP manzil kiriting."],
  [/ must be a valid domain name.*$/, () => "To'g'ri domen nomini kiriting (masalan, example.com)."],
  [/ must be a hex color\.$/, () => "To'g'ri rang tanlang."],
  [/ must be a whole number\.$/, () => "Butun son kiriting."],
  [/ must be a number\.$/, () => 'Son kiriting.'],
  [/ must be at most (\d+) characters\.$/, (m) => `Ko'pi bilan ${m[1]} ta belgi.`],
  [/ must be at least (\d+) characters\.$/, (m) => `Kamida ${m[1]} ta belgi.`],
  [/ must be at most ([\d.]+)\.$/, (m) => `Ko'pi bilan ${m[1]}.`],
  [/ must be at least ([\d.]+)\.$/, (m) => `Kamida ${m[1]}.`],
  [/ must be on or after (.+)\.$/, () => 'Bu sana oldingi sanadan keyin bo\'lishi kerak.'],
  [/ has an invalid value\.$/, () => "Noto'g'ri qiymat."],
  [/ was not found\.$/, () => 'Tanlangan yozuv topilmadi.'],
  [/ is invalid\.$/, () => "Noto'g'ri qiymat."],
  [/ must be a list\.$/, () => "Noto'g'ri qiymat."],
  [/ must be text\.$/, () => 'Matn kiriting.'],

  // ---- monitoring causes ----
  [/^No response$/, () => 'Javob yo\'q'],
  [/^Operation timed out.*$/, () => 'Kutish vaqti tugadi'],
  [/^Expected HTTP (\d+), got (\d+)$/, (m) => `HTTP ${m[1]} kutilgan edi, ${m[2]} keldi`],
  [/^Could(n't| not) resolve host.*$/, () => 'Domen topilmadi (DNS)'],
  [/^Couldn't connect to server$/, () => 'Serverga ulanib bo\'lmadi'],
];

const DEMO_FEATURE = { 'Database backups': 'Zaxira nusxalar', 'Live SSL checking': 'Jonli SSL tekshiruvi', 'Live HTTP checks': 'Jonli HTTP tekshiruvlar' };

function tx(text) {
  for (const [re, fn] of RULES) {
    const m = text.match(re);
    if (m) return fn(m);
  }
  return text;
}

export const translateServer = tx;
export { plural };
