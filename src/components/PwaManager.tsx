import { useEffect } from 'react';
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

  useEffect(() => {
    usePwa.getState().set({ needRefresh });
    if (!needRefresh) return;
    // Tanishtiruv sahifasida yo‘qotiladigan narsa yo‘q — darhol yangi versiyaga o‘tamiz
    if (!inAppNow()) {
      void updateServiceWorker(true);
      return;
    }
    // Ilova ichida: hech qanday oyna (forma) ochiq bo‘lmasa yoki foydalanuvchi ilovadan
    // chiqqanda (fonga o‘tganda) jimgina yangilanadi — keyingi ochilishda yangi versiya
    const applyIfIdle = () => {
      if (document.visibilityState === 'hidden' && !document.querySelector('[role=dialog]')) void updateServiceWorker(true);
    };
    document.addEventListener('visibilitychange', applyIfIdle);
    if (needRefresh) {
      toast.info('Yangi versiya mavjud', 'Ilovani yangilash uchun bosing. Ma’lumotlaringiz saqlanib qoladi.', {
        label: 'Yangilash',
        onClick: () => void updateServiceWorker(true),
      });
    }
    return () => document.removeEventListener('visibilitychange', applyIfIdle);
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    usePwa.getState().set({ offlineReady });
    // Tanishtiruv sahifasida (hali ilova ochilmagan) bu xabar ortiqcha
    if (offlineReady && inAppNow()) {
      toast.success('Ilova offline ishlashga tayyor', 'Endi internet bo‘lmasa ham foydalanishingiz mumkin.');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  return null;
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
