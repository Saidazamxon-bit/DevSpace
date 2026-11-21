import { useEffect, useState } from 'react';
import { CheckCircle2, Download, MoreVertical, PlusSquare, Share, ShieldCheck, Smartphone, Wallet, WifiOff, Zap } from 'lucide-react';
import { usePwa, isIOS } from '@/store/pwa';
import { toast } from '@/store/ui';
import { Logo } from '@/components/Logo';
import { Modal } from '@/components/ui/Modal';

const FEATURES = [
  { icon: Zap, title: 'Bir bosishda', text: '− yoki + ni bosing, summani yozing — tayyor.' },
  { icon: Wallet, title: 'Karta, naqd, jamg‘arma', text: 'Har bir hisob qoldig‘i alohida ko‘rinadi.' },
  { icon: WifiOff, title: 'Internetsiz ishlaydi', text: 'O‘rnatilgandan keyin internet kerak emas.' },
  { icon: ShieldCheck, title: 'Maxfiy', text: 'Ma’lumotlar faqat sizning qurilmangizda.' },
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

  useEffect(() => {
    document.title = 'Personal Finance — shaxsiy moliya ilovasi';
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

  return (
    <div className="min-h-dvh bg-bg">
      <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 pb-10 pt-[calc(var(--safe-top)+1.25rem)] sm:px-8">
        <header className="flex items-center gap-2.5">
          <Logo size={34} />
          <span className="text-[17px] font-bold tracking-tight">Personal Finance</span>
        </header>

        <main className="grid flex-1 items-center gap-10 py-8 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <section className="animate-fade-up">
            <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-[12px] font-semibold text-accent">
              <Smartphone size={14} /> Bepul · Ro‘yxatdan o‘tish shart emas
            </p>
            <h1 className="text-[34px] font-extrabold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              Pulingizni har kuni <span className="text-accent">oson</span> hisoblang
            </h1>
            <p className="mt-4 max-w-lg text-[16px] leading-relaxed text-muted">
              Daromad va xarajatlarni bir bosishda yozing, pulingiz qayerga ketayotganini bitta ekranda aniq ko‘ring. Internetsiz ishlaydi.
            </p>

            {installed ? (
              <div className="mt-7 rounded-2xl border border-income/30 bg-income/10 p-4" role="status" data-testid="installed">
                <p className="flex items-center gap-2 font-semibold text-income">
                  <CheckCircle2 size={20} /> Ilova o‘rnatildi!
                </p>
                <p className="mt-1 text-[14px] text-muted">
                  {platform === 'desktop'
                    ? 'Ilova alohida oynada ochildi. Keyingi safar uni ish stoli yoki Start menyusidagi “Personal Finance” belgisidan oching.'
                    : 'Bosh ekraningizdagi “Moliya” belgisini bosib oching.'}
                </p>
              </div>
            ) : (
              <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
                <button type="button" onClick={() => void install()} disabled={busy} className="btn btn-primary h-14 rounded-2xl px-7 text-[16px] shadow-lift" data-testid="install">
                  <Download size={20} /> Ilovani o‘rnatish
                </button>
                <button type="button" onClick={onContinue} className="btn btn-ghost h-12 text-[15px]">
                  Brauzerda davom etish
                </button>
              </div>
            )}
            {installed && (
              <button type="button" onClick={onContinue} className="mt-3 text-[14px] font-semibold text-accent">
                Yoki shu yerda brauzerda davom etish →
              </button>
            )}

            <ul className="mt-9 grid gap-4 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f.title} className="flex gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface text-accent shadow-card">
                    <f.icon size={19} />
                  </span>
                  <span>
                    <span className="block text-[15px] font-semibold text-ink">{f.title}</span>
                    <span className="block text-[13px] leading-snug text-muted">{f.text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <PhonePreview />
        </main>

        <p className="text-center text-[12px] text-subtle">Ma’lumotlaringiz hech qanday serverga yuborilmaydi · Kuzatuv va reklama yo‘q</p>
      </div>

      <InstallGuide open={guide} platform={platform} onClose={() => setGuide(false)} />
    </div>
  );
}

/** Ilova ko‘rinishining yengil illyustratsiyasi (rasm fayllarisiz) */
function PhonePreview() {
  const segs = [
    { c: '#8b5e3c', v: 46 },
    { c: '#1baf7a', v: 16 },
    { c: '#e87ba4', v: 15 },
    { c: '#eda100', v: 11 },
    { c: '#c026d3', v: 6 },
    { c: '#e34948', v: 4 },
    { c: '#2a78d6', v: 2 },
  ];
  const R = 30;
  const C = 2 * Math.PI * R;
  let off = 0;
  return (
    <div className="mx-auto w-full max-w-[300px] animate-fade-up" aria-hidden>
      <div className="rounded-[2.6rem] border-[10px] border-[#111318] bg-bg p-4 shadow-float">
        <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-line" />
        <div className="rounded-2xl bg-accent px-4 py-3 text-accent-ink">
          <p className="text-[10px] opacity-80">Jami mablag‘</p>
          <p className="text-[19px] font-bold">30 832 000 <span className="text-[11px] opacity-70">so‘m</span></p>
        </div>
        <svg viewBox="0 0 100 100" className="mx-auto my-2 w-[86%]">
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgb(var(--surface-2))" strokeWidth="7" />
          {segs.map((s) => {
            const len = (s.v / 100) * C;
            const el = (
              <circle key={s.c} cx="50" cy="50" r={R} fill="none" stroke={s.c} strokeWidth="7" strokeDasharray={`${len - 0.8} ${C - len + 0.8}`} strokeDashoffset={-off} transform="rotate(-90 50 50)" />
            );
            off += len;
            return el;
          })}
          <text x="50" y="47" textAnchor="middle" fontSize="5" fill="rgb(var(--subtle))">XARAJAT</text>
          <text x="50" y="56" textAnchor="middle" fontSize="8.5" fontWeight="700" fill="rgb(var(--expense))">−6 121 000</text>
        </svg>
        <div className="flex justify-center gap-6 pb-1">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-expense text-2xl font-bold text-white">−</span>
          <span className="grid h-11 w-11 place-items-center rounded-full bg-income text-2xl font-bold text-white">+</span>
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
              { icon: <CheckCircle2 size={18} />, text: <>Ilova alohida oynada ochiladi va ish stolida belgi paydo bo‘ladi</> },
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
