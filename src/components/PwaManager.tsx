import { useEffect, useRef, useState } from 'react';
import { RefreshCw, ShieldCheck, Sparkles } from 'lucide-react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { isStandalone, usePwa } from '@/store/pwa';
import { toast } from '@/store/ui';

/**
 * Service Worker’ni ro‘yxatdan o‘tkazadi.
 * Yangi versiya topilsa — foydalanuvchidan so‘raladi (registerType: 'prompt'),
 * shuning uchun ochiq formadagi ma’lumotlar yo‘qolmaydi.
 */
export function PwaManager() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (!reg) return;
      usePwa.getState().set({
        checkForUpdate: async () => {
          await reg.update();
        },
      });
      const check = () => {
        if (navigator.onLine) reg.update().catch(() => undefined);
      };
      // Har soatda va ilova qayta ochilganda (iPhone o‘rnatilgan ilovani qayta yuklamay davom ettiradi)
      window.setInterval(check, 60 * 60 * 1000);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
      window.addEventListener('online', check);
    },
  });

  useEffect(() => {
    usePwa.getState().set({ update: () => updateServiceWorker(true) });
  }, [updateServiceWorker]);

  const [gate, setGate] = useState(false);

  useEffect(() => {
    usePwa.getState().set({ needRefresh });
    if (!needRefresh) return;
    // Tanishtiruv sahifasida yo‘qotiladigan narsa yo‘q — darhol yangi versiyaga o‘tamiz
    if (!inAppNow()) {
      void updateServiceWorker(true);
      return;
    }
    // Ilova ichida: yopib bo‘lmaydigan “Yangilash” oynasi. Agar hozir forma ochiq bo‘lsa —
    // kiritilayotgan ma’lumot yo‘qolmasligi uchun forma yopilishini kutamiz.
    const tryShow = () => {
      if (!document.querySelector('[role=dialog]')) {
        setGate(true);
        return true;
      }
      return false;
    };
    if (tryShow()) return;
    const id = window.setInterval(() => tryShow() && window.clearInterval(id), 700);
    return () => window.clearInterval(id);
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    usePwa.getState().set({ offlineReady });
    // Tanishtiruv sahifasida (hali ilova ochilmagan) bu xabar ortiqcha
    if (offlineReady && inAppNow()) {
      toast.success('Ilova offline ishlashga tayyor', 'Endi internet bo‘lmasa ham foydalanishingiz mumkin.');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  return gate ? <UpdateGate onUpdate={() => updateServiceWorker(true)} /> : null;
}

/** Yangi versiya oynasi — yopib bo‘lmaydi, faqat “Yangilash” tugmasi */
function UpdateGate({ onUpdate }: { onUpdate: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    btnRef.current?.focus();
    // Fon sahifa aylanmasin va Esc bilan yopilmasin
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const block = (e: KeyboardEvent) => {
      if (e.key === 'Escape') e.preventDefault();
      if (e.key === 'Tab') {
        e.preventDefault();
        btnRef.current?.focus();
      }
    };
    window.addEventListener('keydown', block, true);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener('keydown', block, true);
    };
  }, []);

  async function update() {
    setBusy(true);
    // Service Worker sahifani o‘zi qayta yuklaydi; har ehtimolga qarshi zaxira
    window.setTimeout(() => window.location.reload(), 4000);
    try {
      await onUpdate();
    } catch {
      window.location.reload();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center bg-black/55 p-4 pb-[calc(var(--safe-bottom)+1rem)] backdrop-blur-md animate-fade-in sm:items-center"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="upd-title"
      aria-describedby="upd-desc"
      data-testid="update-gate"
    >
      <div className="w-full max-w-sm overflow-hidden rounded-[2rem] bg-surface text-center shadow-lift animate-fade-up">
        <div className="hero-bg relative px-6 pb-7 pt-8 text-white">
          <div aria-hidden className="hero-rings pointer-events-none absolute inset-0" />
          <span className="relative mx-auto grid h-16 w-16 place-items-center rounded-[1.35rem] bg-white/20 ring-1 ring-inset ring-white/30 backdrop-blur">
            <Sparkles size={30} />
          </span>
          <h2 id="upd-title" className="relative mt-4 text-[21px] font-bold tracking-tight">
            Yangi versiya tayyor
          </h2>
          <p id="upd-desc" className="relative mt-1 text-[14.5px] leading-snug text-white/85">
            Ilova yaxshilandi. Davom etish uchun yangilang — bu bir necha soniya oladi.
          </p>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3 rounded-2xl bg-income/10 p-3.5 text-left">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-income/15 text-income">
              <ShieldCheck size={19} />
            </span>
            <p className="text-[13.5px] leading-snug text-ink">
              <b>Ma’lumotlaringizga zarar yetmaydi.</b>{' '}
              <span className="text-muted">Barcha yozuvlar, hisoblar, budjetlar va sozlamalar telefoningizda saqlanib qoladi — hech narsa o‘chmaydi.</span>
            </p>
          </div>
          <button
            ref={btnRef}
            type="button"
            onClick={() => void update()}
            disabled={busy}
            className="btn btn-primary mt-4 h-14 w-full rounded-full text-[16px] font-bold"
          >
            <RefreshCw size={19} className={busy ? 'animate-spin' : undefined} />
            {busy ? 'Yangilanmoqda…' : 'Yangilash'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Ilova ochilganmi (o‘rnatilgan yoki “Brauzerda davom etish” bosilgan) — tanishtiruv sahifasida emas */
function inAppNow() {
  if (isStandalone()) return true;
  try {
    return sessionStorage.getItem('pf-browser') === '1';
  } catch {
    return false;
  }
}
