import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { usePwa } from '@/store/pwa';
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
      // Har soatda yangilanishni tekshirish (faqat internet bo‘lsa)
      window.setInterval(() => {
        if (navigator.onLine) reg.update().catch(() => undefined);
      }, 60 * 60 * 1000);
    },
  });

  useEffect(() => {
    usePwa.getState().set({ update: () => updateServiceWorker(true) });
  }, [updateServiceWorker]);

  useEffect(() => {
    usePwa.getState().set({ needRefresh });
    if (needRefresh) {
      toast.info('Yangi versiya mavjud', 'Ilovani yangilash uchun bosing. Ma’lumotlaringiz saqlanib qoladi.', {
        label: 'Yangilash',
        onClick: () => void updateServiceWorker(true),
      });
    }
  }, [needRefresh, updateServiceWorker]);

  useEffect(() => {
    usePwa.getState().set({ offlineReady });
    if (offlineReady) {
      toast.success('Ilova offline ishlashga tayyor', 'Endi internet bo‘lmasa ham foydalanishingiz mumkin.');
      setOfflineReady(false);
    }
  }, [offlineReady, setOfflineReady]);

  return null;
}
