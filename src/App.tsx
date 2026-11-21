import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom';
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
import { getSecurity } from './services/finance';
import { requestPersistentStorage } from './database/db';

const Home = lazy(() => import('./pages/Home'));
const Transactions = lazy(() => import('./pages/Transactions'));
const Budgets = lazy(() => import('./pages/Budgets'));
const Categories = lazy(() => import('./pages/Categories'));
const Settings = lazy(() => import('./pages/Settings'));

function PageFallback() {
  return (
    <div className="mx-auto max-w-md space-y-4 pt-16" aria-busy="true" aria-label="Yuklanmoqda">
      <Skeleton className="mx-auto h-8 w-60 rounded-full" />
      <Skeleton className="mx-auto aspect-square w-full max-w-[340px] rounded-full" />
      <Skeleton className="h-14 rounded-2xl" />
    </div>
  );
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
        {ready && !locked && (
          <>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<Suspense fallback={<PageFallback />}><Home /></Suspense>} />
                <Route path="transactions" element={<Suspense fallback={<PageFallback />}><Transactions /></Suspense>} />
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
