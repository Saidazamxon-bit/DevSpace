import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight, BellRing, CheckCircle2, ChevronDown, Download, Fingerprint, Lock, MoreVertical, PieChart, PlusSquare, Repeat, Server, Share,
  ShieldCheck, Smartphone, Wallet, WifiOff, Zap,
} from 'lucide-react';
import { usePwa, isIOS } from '@/store/pwa';
import { toast } from '@/store/ui';
import { Logo } from '@/components/Logo';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/utils/misc';
import appPreview from '@/assets/app-preview.webp';

const FEATURES = [
  { icon: Zap, color: '#1baf7a', title: 'Besh soniyada yozing', text: '− yoki + ni bosing, summani ilovaning o‘z klaviaturasida kiriting, kategoriyani tanlang. Shu bilan tamom.' },
  { icon: PieChart, color: '#2a78d6', title: 'Pul qayerga ketyapti — aniq', text: 'Kategoriyalar bo‘yicha diagramma, davr bo‘yicha taqqoslash va jami mablag‘ning o‘zgarish grafigi.' },
  { icon: Wallet, color: '#eda100', title: 'Karta, naqd va jamg‘arma', text: 'Har bir hisob qoldig‘i alohida. Kartadan naqd yechish va jamg‘armaga qo‘yish — bitta o‘tkazma bilan.' },
  { icon: BellRing, color: '#eb6834', title: 'Budjet va eslatmalar', text: 'Oylik limit qo‘ying — 80% ga yetganda ogohlantiradi. Ijara, oylik kabi doimiy to‘lovlarni o‘zi eslatadi.' },
  { icon: WifiOff, color: '#6250d6', title: 'Internetsiz ishlaydi', text: 'Bir marta o‘rnating — keyin metroda ham, samolyotda ham to‘liq ishlaydi. Hech narsa yuklanishini kutmaysiz.' },
  { icon: ShieldCheck, color: '#e34948', title: 'Ma’lumotlar faqat sizda', text: 'Hech qanday server, akkaunt yoki reklama yo‘q. PIN-kod va Face ID / barmoq izi bilan qulflash.' },
];

const STEPS = [
  { n: 1, title: 'O‘rnating', text: '“Ilovani o‘rnatish” tugmasini bosing — telefoningiz bosh ekranida belgi paydo bo‘ladi. App Store yoki Play Market shart emas.' },
  { n: 2, title: 'Qoldiqlarni kiriting', text: 'Kartangizda, hamyoningizda va jamg‘armangizda hozir qancha borligini bir marta yozing.' },
  { n: 3, title: 'Har kuni 5 soniya', text: 'Har bir xarid yoki tushumni darhol yozib boring. Oy oxirida pulingiz qayerga ketganini aniq ko‘rasiz.' },
];

const FAQ = [
  { q: 'Ilova bepulmi?', a: 'Ha, butunlay bepul. Ro‘yxatdan o‘tish, karta ma’lumotlari yoki obuna talab qilinmaydi.' },
  { q: 'Internet kerakmi?', a: 'Faqat birinchi ochish va o‘rnatish uchun. Shundan keyin ilova to‘liq internetsiz ishlaydi, yangilanishlar esa internet bo‘lganda o‘zi tekshiriladi.' },
  { q: 'Ma’lumotlarim qayerda saqlanadi?', a: 'Faqat sizning qurilmangizda (brauzer xotirasida). Ular hech qanday serverga yuborilmaydi, biz ularni ko‘ra olmaymiz.' },
  { q: 'Telefonim almashsa, ma’lumotlar yo‘qolmaydimi?', a: 'Sozlamalardan bir bosishda zaxira fayl yuklab oling (xohlasangiz, parol bilan shifrlangan). Yangi telefonda “Zaxiradan tiklash” orqali hammasi qaytadi. Ilova haftada bir marta zaxira olishni o‘zi eslatadi.' },
  { q: 'iPhone’ga qanday o‘rnataman?', a: 'Sahifani Safari’da oching → pastdagi “Ulashish” tugmasi → “Bosh ekranga qo‘shish”. Ilova alohida oynada, oddiy ilovadek ishlaydi.' },
  { q: 'Qaysi valyutalarni qo‘llaydi?', a: 'O‘zbek so‘mi, AQSH dollari, yevro va rubl. Summalar tiyin aniqligida hisoblanadi — yaxlitlash xatolari bo‘lmaydi.' },
];

type Platform = 'ios-safari' | 'ios-other' | 'android' | 'desktop';

function detectPlatform(): Platform {
  const ua = navigator.userAgent;
  if (isIOS()) return /CriOS|FxiOS|EdgiOS/.test(ua) ? 'ios-other' : 'ios-safari';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
}

/** Brauzerda ochilganda ko‘rsatiladigan tanishtiruv sahifasi va o‘rnatish oqimi */
export default function Landing({ onContinue }: { onContinue: () => void }) {
  const installEvent = usePwa((s) => s.installEvent);
  const installed = usePwa((s) => s.installed);
  const setPwa = usePwa((s) => s.set);
  const [guide, setGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const platform = detectPlatform();
  const rootRef = useRef<HTMLDivElement>(null);

  // Bo‘limlar scroll qilinganda silliq paydo bo‘ladi
  useEffect(() => {
    const els = rootRef.current?.querySelectorAll<HTMLElement>('.reveal');
    if (!els?.length) return;
    if (typeof IntersectionObserver === 'undefined') {
      els.forEach((el) => el.classList.add('is-in'));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('is-in');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [installed]);

  useEffect(() => {
    document.title = 'Personal Finance — shaxsiy moliyani oson boshqaring';
    return () => {
      document.title = 'Personal Finance';
    };
  }, []);

  async function install() {
    // Chrome / Edge / Android: brauzerning o‘z ruxsat oynasi
    if (installEvent) {
      setBusy(true);
      try {
        await installEvent.prompt();
        const { outcome } = await installEvent.userChoice;
        setPwa({ installEvent: null });
        if (outcome === 'accepted') setPwa({ installed: true });
        else toast.info('O‘rnatish bekor qilindi', 'Istalgan vaqtda qayta o‘rnatishingiz mumkin.');
      } finally {
        setBusy(false);
      }
      return;
    }
    // iPhone (Safari) va boshqa brauzerlar — qo‘lda o‘rnatish yo‘riqnomasi
    setGuide(true);
  }

  const cta = (big?: boolean) =>
    installed ? (
      <div className="rounded-3xl bg-white/95 p-4 text-left shadow-soft dark:bg-surface" role="status" data-testid="installed">
        <p className="flex items-center gap-2 font-semibold text-income">
          <CheckCircle2 size={20} /> Ilova o‘rnatildi!
        </p>
        <p className="mt-1 text-[14px] text-muted">
          {platform === 'desktop'
            ? 'Ilova alohida oynada ochildi. Keyingi safar ish stoli yoki Start menyusidagi “Personal Finance” belgisidan oching.'
            : 'Bosh ekraningizdagi “Moliya” belgisini bosib oching.'}
        </p>
        <button type="button" onClick={onContinue} className="mt-2 text-[14px] font-semibold text-accent">
          Yoki shu yerda davom etish →
        </button>
      </div>
    ) : (
      <div className={cn('flex flex-col gap-3', big ? 'sm:flex-row sm:justify-center' : 'sm:flex-row sm:items-center')}>
        <button
          type="button"
          onClick={() => void install()}
          disabled={busy}
          className="btn h-14 rounded-full bg-white px-8 text-[16px] font-bold text-[#0f3d2a] shadow-lift transition-transform hover:bg-white/90 active:scale-[0.97] dark:bg-white"
          data-testid={big ? 'install-bottom' : 'install'}
        >
          <Download size={20} /> Ilovani o‘rnatish
        </button>
        <button type="button" onClick={onContinue} className="btn h-12 rounded-full border border-white/40 bg-white/10 px-6 text-[15px] text-white backdrop-blur hover:bg-white/20">
          Brauzerda davom etish
        </button>
      </div>
    );

  return (
    <div ref={rootRef} className="min-h-dvh overflow-x-clip bg-bg">
      {/* ── Bosh qism ── */}
      <section
        className="relative overflow-hidden rounded-b-[2.5rem] pb-12 text-white"
        style={{ background: 'radial-gradient(120% 100% at 30% 0%, rgb(var(--accent)) 0%, rgb(var(--accent) / 0.85) 50%, rgb(10 60 40) 120%)' }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.1]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 75% 40%, transparent 0 90px, #fff 91px 92px, transparent 93px 160px, #fff 161px 162px, transparent 163px 240px, #fff 241px 242px, transparent 243px)',
          }}
        />
        <div className="relative mx-auto max-w-6xl px-5 pt-[calc(var(--safe-top)+1.25rem)] sm:px-8">
          <header className="flex items-center gap-2.5">
            <span className="grid h-11 w-11 place-items-center rounded-full bg-white/20 backdrop-blur">
              <Logo size={30} />
            </span>
            <span className="text-[17px] font-bold tracking-tight">Personal Finance</span>
          </header>

          <div className="grid items-center gap-10 pt-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14 lg:pt-14">
            <div className="animate-fade-up">
              <p className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[12.5px] font-semibold backdrop-blur">
                <Smartphone size={14} /> Bepul · Ro‘yxatdan o‘tishsiz · Internetsiz
              </p>
              <h1 className="text-[36px] font-extrabold leading-[1.08] tracking-tight sm:text-[52px]">
                Pulingiz qayerga ketayotganini aniq biling
              </h1>
              <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-white/85">
                Personal Finance — daromad va xarajatlarni bir necha soniyada yozib boradigan, karta, naqd va jamg‘armangizni bir joyda ko‘rsatadigan shaxsiy moliya ilovasi. Ma’lumotlaringiz faqat sizning telefoningizda qoladi.
              </p>
              <div className="mt-8">{cta()}</div>
              <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-white/75">
                <span className="inline-flex items-center gap-1.5"><Lock size={14} /> Server yo‘q</span>
                <span className="inline-flex items-center gap-1.5"><WifiOff size={14} /> Offline</span>
                <span className="inline-flex items-center gap-1.5"><Fingerprint size={14} /> PIN / Face ID</span>
              </p>
            </div>
            <PhonePreview />
          </div>
        </div>
      </section>

      {/* ── Imkoniyatlar ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8" aria-labelledby="f-title">
        <p className="reveal text-center text-[13px] font-semibold uppercase tracking-wider text-accent">Imkoniyatlar</p>
        <h2 id="f-title" className="reveal mx-auto mt-2 max-w-2xl text-center text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-[36px]">
          Moliyaviy tartib uchun kerakli hamma narsa — ortiqchasiz
        </h2>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f, i) => (
            <li key={f.title} className="card reveal" style={{ '--d': `${(i % 3) * 90}ms` } as React.CSSProperties}>
              <span className="grid h-12 w-12 place-items-center rounded-full text-white" style={{ background: f.color }}>
                <f.icon size={22} />
              </span>
              <h3 className="mt-4 text-[17px] font-bold text-ink">{f.title}</h3>
              <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{f.text}</p>
            </li>
          ))}
        </ul>
      </section>

      {/* ── Qanday ishlaydi ── */}
      <section className="bg-surface py-16" aria-labelledby="s-title">
        <div className="mx-auto max-w-6xl px-5 sm:px-8">
          <p className="reveal text-center text-[13px] font-semibold uppercase tracking-wider text-accent">Qanday ishlaydi</p>
          <h2 id="s-title" className="reveal mt-2 text-center text-[28px] font-bold tracking-tight text-ink sm:text-[36px]">3 qadamda boshlang</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <li key={s.n} className="reveal relative rounded-[1.75rem] bg-bg p-6" style={{ '--d': `${i * 120}ms` } as React.CSSProperties}>
                <span className="grid h-11 w-11 place-items-center rounded-full bg-accent text-[18px] font-bold text-accent-ink">{s.n}</span>
                <h3 className="mt-4 text-[18px] font-bold text-ink">{s.title}</h3>
                <p className="mt-1.5 text-[14.5px] leading-relaxed text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── Maxfiylik ── */}
      <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8" aria-labelledby="p-title">
        <div className="reveal grid items-center gap-10 rounded-[2rem] bg-[#0f1a16] p-8 text-white sm:p-12 lg:grid-cols-2">
          <div>
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-white/10">
              <ShieldCheck size={28} />
            </span>
            <h2 id="p-title" className="mt-5 text-[28px] font-bold leading-tight tracking-tight sm:text-[34px]">Sizning pulingiz — sizning sirringiz</h2>
            <p className="mt-3 text-[15.5px] leading-relaxed text-white/75">
              Biz hech qanday ma’lumot to‘plamaymiz. Ilova bank ilovalariga ulanmaydi, parol so‘ramaydi va siz kiritgan raqamlarni hech qayerga yubormaydi.
            </p>
          </div>
          <ul className="space-y-4">
            {[
              { icon: Server, t: 'Server va akkaunt yo‘q', d: 'Barcha hisob-kitoblar telefoningizning o‘zida bajariladi.' },
              { icon: Fingerprint, t: 'PIN-kod va biometrik qulf', d: 'Ilovani boshqalar ochib ko‘rishidan himoyalang.' },
              { icon: Lock, t: 'Shifrlangan zaxira', d: 'Zaxira faylini parol bilan AES-256 shifrlash mumkin.' },
              { icon: ArrowLeftRight, t: 'Erkin eksport', d: 'Ma’lumotlaringizni istalgan vaqtda JSON yoki Excel (CSV) ko‘rinishida oling.' },
            ].map((x) => (
              <li key={x.t} className="flex gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10">
                  <x.icon size={18} />
                </span>
                <span>
                  <span className="block font-semibold">{x.t}</span>
                  <span className="block text-[14px] text-white/70">{x.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ── Savollar ── */}
      <section className="mx-auto max-w-3xl px-5 pb-16 sm:px-8" aria-labelledby="q-title">
        <h2 id="q-title" className="reveal text-center text-[28px] font-bold tracking-tight text-ink sm:text-[34px]">Ko‘p beriladigan savollar</h2>
        <div className="reveal card-flush mt-8 divide-y divide-line/60">
          {FAQ.map((f) => (
            <details key={f.q} className="group px-5 py-4 [&_summary::-webkit-details-marker]:hidden">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[16px] font-semibold text-ink">
                {f.q}
                <ChevronDown size={18} className="shrink-0 text-subtle transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── Yakuniy chaqiriq ── */}
      <section className="px-5 pb-12 sm:px-8">
        <div
          className="reveal mx-auto max-w-6xl rounded-[2rem] px-6 py-12 text-center text-white"
          style={{ background: 'radial-gradient(120% 120% at 50% 0%, rgb(var(--accent)) 0%, rgb(var(--accent) / 0.85) 55%, rgb(10 60 40) 130%)' }}
        >
          <h2 className="text-[26px] font-bold tracking-tight sm:text-[34px]">Bugundan boshlab pulingizni nazorat qiling</h2>
          <p className="mx-auto mt-2 max-w-xl text-[15.5px] text-white/80">O‘rnatish bir necha soniya oladi. Hech qanday ro‘yxatdan o‘tish yo‘q.</p>
          <div className="mt-7">{cta(true)}</div>
        </div>
        <footer className="mx-auto mt-8 flex max-w-6xl flex-col items-center justify-between gap-2 text-[12.5px] text-subtle sm:flex-row">
          <span className="flex items-center gap-2">
            <Logo size={20} /> Personal Finance
          </span>
          <span>Ma’lumotlaringiz hech qanday serverga yuborilmaydi · Kuzatuv va reklama yo‘q</span>
        </footer>
      </section>

      <InstallGuide open={guide} platform={platform} onClose={() => setGuide(false)} />
    </div>
  );
}

/**
 * Ilova ko‘rinishi — iPhone maketi. Scroll qilinganda telefon orqaga yotgan holatdan
 * to‘g‘rilanib, kattalashib chiqadi; keyin yengil suzib turadi.
 */
function PhonePreview() {
  const ref = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    const tilt = tiltRef.current;
    if (!el || !tilt) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'off') return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // 0 — telefon ekran pastida endi ko‘rindi, 1 — ekranning yuqori choragiga yetdi
      const p = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.7)));
      const e = 1 - Math.pow(1 - p, 3);
      // To‘g‘rilangandan keyin chuqurlik uchun yengil parallaks
      const past = Math.max(0, -r.top) * 0.12;
      tilt.style.transform = `translateY(${((1 - e) * 70 - past).toFixed(1)}px) rotateX(${((1 - e) * 28).toFixed(2)}deg) scale(${(0.86 + 0.14 * e).toFixed(3)})`;
      tilt.style.opacity = (0.35 + 0.65 * e).toFixed(3);
      if (glowRef.current) glowRef.current.style.opacity = (0.2 + 0.8 * e).toFixed(3);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, []);

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-[330px] [perspective:1100px]" data-testid="phone-preview">
      {/* Orqadagi yumshoq nur */}
      <div ref={glowRef} aria-hidden className="absolute inset-x-4 bottom-10 top-16 rounded-[3rem] bg-white/30 blur-3xl transition-opacity" />
      <div ref={tiltRef} className="relative origin-[50%_85%] will-change-transform">
        <div className="phone-float">
          <img
            src={appPreview}
            alt="Personal Finance ilovasi iPhone’da: jami mablag‘, grafik, daromad va xarajat, daromadni taqsimlash"
            width={760}
            height={1568}
            decoding="async"
            className="relative h-auto w-full select-none drop-shadow-[0_34px_50px_rgb(0_0_0/0.4)]"
            draggable={false}
          />
        </div>
      </div>
    </div>
  );
}

function InstallGuide({ open, platform, onClose }: { open: boolean; platform: Platform; onClose: () => void }) {
  const steps: { icon: React.ReactNode; text: React.ReactNode }[] =
    platform === 'ios-safari'
      ? [
          { icon: <Share size={18} />, text: <>Pastdagi <b>“Ulashish”</b> tugmasini bosing</> },
          { icon: <PlusSquare size={18} />, text: <><b>“Bosh ekranga qo‘shish”</b> (Add to Home Screen) ni tanlang</> },
          { icon: <CheckCircle2 size={18} />, text: <>Yuqori o‘ngdagi <b>“Qo‘shish”</b> ni bosing — ilova bosh ekranda paydo bo‘ladi</> },
        ]
      : platform === 'ios-other'
        ? [
            { icon: <Smartphone size={18} />, text: <>iPhone’da ilovani faqat <b>Safari</b> orqali o‘rnatish mumkin. Ushbu sahifani Safari’da oching.</> },
            { icon: <Share size={18} />, text: <>So‘ng <b>“Ulashish”</b> → <b>“Bosh ekranga qo‘shish”</b></> },
          ]
        : platform === 'android'
          ? [
              { icon: <MoreVertical size={18} />, text: <>Brauzer menyusini (<b>⋮</b>) oching</> },
              { icon: <Download size={18} />, text: <><b>“Ilovani o‘rnatish”</b> yoki <b>“Bosh ekranga qo‘shish”</b> ni tanlang</> },
              { icon: <CheckCircle2 size={18} />, text: <>Tasdiqlang — ilova bosh ekranda paydo bo‘ladi</> },
            ]
          : [
              { icon: <Download size={18} />, text: <>Manzil satrining o‘ng tomonidagi <b>o‘rnatish belgisini</b> bosing (Chrome yoki Edge)</> },
              { icon: <MoreVertical size={18} />, text: <>Yoki brauzer menyusi → <b>“Personal Finance’ni o‘rnatish”</b></> },
              { icon: <Repeat size={18} />, text: <>Ilova alohida oynada ochiladi va ish stolida belgi paydo bo‘ladi</> },
            ];
  return (
    <Modal open={open} onClose={onClose} size="sm" title="Ilovani o‘rnatish" description="Bir necha soniya vaqt oladi" footer={<button className="btn btn-primary w-full" onClick={onClose}>Tushunarli</button>}>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">{s.icon}</span>
            <span className="pt-1.5 text-[15px] leading-snug text-ink">
              <span className="mr-1 font-semibold text-subtle">{i + 1}.</span>
              {s.text}
            </span>
          </li>
        ))}
      </ol>
    </Modal>
  );
}
