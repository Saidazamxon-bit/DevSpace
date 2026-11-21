import { lazy, Suspense, useEffect, useState } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { TransactionForm } from './components/TransactionForm';
import { TransferForm } from './components/TransferForm';
import { ConfirmHost } from './components/ui/ConfirmHost';
import { ToastHost } from './components/ui/ToastHost';
import { PwaManager } from './components/PwaManager';
import { LockScreen } from './components/LockScreen';
import { Skeleton } from './components/ui/primitives';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useApplyTheme } from './hooks/useTheme';
import { useLock, toast } from './store/ui';
import { getSecurity } from './services/finance';
import { requestPersistentStorage } from './database/db';
import { isStandalone } from './store/pwa';

const BROWSER_FLAG = 'pf-browser';

/** O‘rnatilgan ilova (standalone) yoki foydalanuvchi “Brauzerda davom etish”ni tanlagan */
function useInApp(): [boolean, () => void] {
  const [inApp, setInApp] = useState(() => {
    if (isStandalone()) return true;
    try {
      return sessionStorage.getItem(BROWSER_FLAG) === '1';
    } catch {
      return false;
    }
  });
  useEffect(() => {
    const m = window.matchMedia?.('(display-mode: standalone)');
    const on = () => m?.matches && setInApp(true);
    m?.addEventListener?.('change', on);
    return () => m?.removeEventListener?.('change', on);
  }, []);
  const continueInBrowser = () => {
    try {
      sessionStorage.setItem(BROWSER_FLAG, '1');
    } catch {
      /* */
    }
    setInApp(true);
  };
  return [inApp, continueInBrowser];
}

const Home = lazy(() => import('./pages/Home'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Categories = lazy(() => import('./pages/Categories'));
const Settings = lazy(() => import('./pages/Settings'));
const Accounts = lazy(() => import('./pages/Accounts'));
const Analytics = lazy(() => import('./pages/Analytics'));
const More = lazy(() => import('./pages/More'));
const Distribution = lazy(() => import('./pages/Distribution'));
const Landing = lazy(() => import('./pages/Landing'));
const RecurringPage = lazy(() => import('./pages/Recurring'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-md space-y-4 pt-16" aria-busy="true" aria-label="Yuklanmoqda">
      <Skeleton className="mx-auto h-8 w-60 rounded-full" />
      <Skeleton className="mx-auto aspect-square w-full max-w-[340px] rounded-full" />
      <Skeleton className="h-14 rounded-2xl" />
    </div>
  );
}

const HIDDEN_KEY = 'pf-hidden-at';
function readHiddenAt(): number {
  try {
    const v = Number(localStorage.getItem(HIDDEN_KEY));
    // Kelajakdagi vaqt (soat o‘zgartirilgan) — ishonmaymiz
    return Number.isFinite(v) && v <= Date.now() ? v : 0;
  } catch {
    return 0;
  }
}
function writeHiddenAt(t: number) {
  try {
    localStorage.setItem(HIDDEN_KEY, String(t));
  } catch {
    /* maxfiy rejim */
  }
}

/** PIN o‘rnatilgan bo‘lsa — ishga tushganda va fondan qaytganda qulflash */
function useAppLock() {
  const setLocked = useLock((s) => s.setLocked);
  const setReady = useLock((s) => s.setReady);
  useEffect(() => {
    let hiddenAt = 0;
    let unloading = false;
    const onPageHide = () => {
      unloading = true;
    };
    const onPageShow = () => {
      unloading = false;
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('pageshow', onPageShow);
    getSecurity()
      .then((cfg) => {
        // iPhone fondagi ilovani tez-tez to‘liq yopib qo‘yadi. Agar ilova yaqinda
        // (avtomatik qulflash vaqtidan oldin) yopilgan bo‘lsa — qayta PIN so‘ramaymiz.
        const last = readHiddenAt();
        const recent = last > 0 && Date.now() - last < cfg.autoLockMinutes * 60_000;
        if (cfg.pinHash && !recent) setLocked(true);
      })
      .catch(() => undefined)
      .finally(setReady);

    const onVis = async () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        // Qulf ochiq bo‘lgandagina eslab qolamiz (qulflangan ilova qulflangan holda qoladi)
        // Sahifa yangilanayotgan/yopilayotgan bo‘lsa (pagehide) — hisoblamaymiz
        if (!useLock.getState().locked && !unloading) writeHiddenAt(hiddenAt);
        return;
      }
      if (!hiddenAt) return;
      const cfg = await getSecurity();
      if (cfg.pinHash && Date.now() - hiddenAt >= cfg.autoLockMinutes * 60_000) setLocked(true);
      hiddenAt = 0;
    };
    document.addEventListener('visibilitychange', onVis);
    // Qo‘lda yoki taymer bilan qulflansa — “yaqinda yopilgan” belgisini o‘chiramiz
    const unsub = useLock.subscribe((st, prev) => {
      if (st.locked && !prev.locked) {
        try {
          localStorage.removeItem(HIDDEN_KEY);
        } catch {
          /* */
        }
      }
    });
    return () => {
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('pageshow', onPageShow);
      unsub();
    };
  }, [setLocked, setReady]);
}

export default function App() {
  useApplyTheme();
  useAppLock();
  const locked = useLock((s) => s.locked);
  const ready = useLock((s) => s.ready);
  const [inApp, continueInBrowser] = useInApp();

  useEffect(() => {
    void requestPersistentStorage();
    const onDbChange = () =>
      toast.info('Ilova boshqa oynada yangilandi', 'Davom etish uchun sahifani yangilang.', { label: 'Yangilash', onClick: () => window.location.reload() });
    window.addEventListener('pf:db-version-change', onDbChange);
    return () => window.removeEventListener('pf:db-version-change', onDbChange);
  }, []);

  return (
    <ErrorBoundary>
      <HashRouter>
        {!inApp ? (
          <Suspense fallback={null}>
            <Landing onContinue={continueInBrowser} />
          </Suspense>
        ) : (
          <>
            {ready && !locked && (
              <>
                <Routes>
                  <Route element={<AppLayout />}>
                    <Route index element={<Suspense fallback={<PageFallback />}><Home /></Suspense>} />
                    <Route path="transactions" element={<Suspense fallback={<PageFallback />}><Transactions /></Suspense>} />
                    <Route path="budgets" element={<Suspense fallback={<PageFallback />}><Budgets /></Suspense>} />
                    <Route path="categories" element={<Suspense fallback={<PageFallback />}><Categories /></Suspense>} />
                    <Route path="analytics" element={<Suspense fallback={<PageFallback />}><Analytics /></Suspense>} />
                    <Route path="distribution" element={<Suspense fallback={<PageFallback />}><Distribution /></Suspense>} />
                    <Route path="more" element={<Suspense fallback={<PageFallback />}><More /></Suspense>} />
                    <Route path="accounts" element={<Suspense fallback={<PageFallback />}><Accounts /></Suspense>} />
                    <Route path="recurring" element={<Suspense fallback={<PageFallback />}><RecurringPage /></Suspense>} />
                    <Route path="settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Routes>
                <TransactionForm />
                <TransferForm />
              </>
            )}
            {locked && <LockScreen />}
          </>
        )}
        <ConfirmHost />
        <ToastHost />
        <PwaManager />
      </HashRouter>
    </ErrorBoundary>
  );
}
