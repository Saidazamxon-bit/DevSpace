import { lazy, Suspense, useEffect, useRef } from 'react';
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { TransactionForm } from './components/TransactionForm';
import { ConfirmHost } from './components/ui/ConfirmHost';
import { ToastHost } from './components/ui/ToastHost';
import { PwaManager } from './components/PwaManager';
import { LockScreen } from './components/LockScreen';
import { Skeleton } from './components/ui/primitives';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useApplyTheme } from './hooks/useTheme';
import { useLock, toast } from './store/ui';
import { useSettings } from './store/settings';
import { getSecurity } from './services/finance';
import { requestPersistentStorage } from './database/db';

const Dashboard = lazy(() => import('./pages/Dashboard'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Analytics = lazy(() => import('./pages/Analytics'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Categories = lazy(() => import('./pages/Categories'));
const Settings = lazy(() => import('./pages/Settings'));

function PageFallback() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Yuklanmoqda">
      <Skeleton className="h-9 w-56" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-32 rounded-3xl" />)}
      </div>
      <Skeleton className="h-72 rounded-3xl" />
    </div>
  );
}

/** Ilova ochilganda tanlangan birinchi sahifaga yo‘naltirish */
function StartPageRedirect() {
  const navigate = useNavigate();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const start = useSettings.getState().startPage;
    const hash = window.location.hash.replace(/^#/, '');
    if (start !== '/' && (hash === '' || hash === '/')) navigate(start, { replace: true });
  }, [navigate]);
  return null;
}

/** PIN o‘rnatilgan bo‘lsa — ishga tushganda va fondan qaytganda qulflash */
function useAppLock() {
  const setLocked = useLock((s) => s.setLocked);
  const setReady = useLock((s) => s.setReady);
  useEffect(() => {
    let hiddenAt = 0;
    getSecurity()
      .then((cfg) => {
        if (cfg.pinHash) setLocked(true);
      })
      .catch(() => undefined)
      .finally(setReady);

    const onVis = async () => {
      if (document.visibilityState === 'hidden') {
        hiddenAt = Date.now();
        return;
      }
      if (!hiddenAt) return;
      const cfg = await getSecurity();
      if (cfg.pinHash && Date.now() - hiddenAt >= cfg.autoLockMinutes * 60_000) setLocked(true);
      hiddenAt = 0;
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [setLocked, setReady]);
}

export default function App() {
  useApplyTheme();
  useAppLock();
  const locked = useLock((s) => s.locked);
  const ready = useLock((s) => s.ready);

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
        <StartPageRedirect />
        {ready && !locked && (
          <>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Suspense fallback={<PageFallback />}><Dashboard /></Suspense>} />
                <Route path="transactions" element={<Suspense fallback={<PageFallback />}><Transactions /></Suspense>} />
                <Route path="analytics" element={<Suspense fallback={<PageFallback />}><Analytics /></Suspense>} />
                <Route path="budgets" element={<Suspense fallback={<PageFallback />}><Budgets /></Suspense>} />
                <Route path="categories" element={<Suspense fallback={<PageFallback />}><Categories /></Suspense>} />
                <Route path="settings" element={<Suspense fallback={<PageFallback />}><Settings /></Suspense>} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
            <TransactionForm />
          </>
        )}
        {locked && <LockScreen />}
        <ConfirmHost />
        <ToastHost />
        <PwaManager />
      </HashRouter>
    </ErrorBoundary>
  );
}
