/**
 * Telefonda sahifani kattalashtirish/kichiklashtirishni butunlay o‘chiradi.
 *
 * iOS Safari (iOS 10+) viewport’dagi `user-scalable=no` va `maximum-scale` ni foydalanuvchi
 * pinch-zoom’i uchun e’tiborsiz qoldiradi, CSS `touch-action` ni ham to‘liq qo‘llamaydi.
 * Shuning uchun pinch bir necha bosqichda JS orqali bloklanadi:
 *  1) ikkinchi barmoq tekkan zahoti (touchstart) — pinch umuman boshlanmaydi;
 *  2) touchmove: ikki barmoq yoki iOS `scale` ≠ 1 bo‘lsa;
 *  3) iOS’ning maxsus gesturestart/gesturechange/gestureend hodisalari.
 * Ikki marta bosib kattalashtirish CSS `touch-action: manipulation` bilan o‘chirilgan (index.css).
 */
export function disableZoom() {
  if (typeof document === 'undefined') return;
  const opts: AddEventListenerOptions = { passive: false, capture: true };
  const block = (e: Event) => {
    if (e.cancelable) e.preventDefault();
  };

  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length > 1) block(e);
    },
    opts,
  );

  document.addEventListener(
    'touchmove',
    (e) => {
      const scale = (e as TouchEvent & { scale?: number }).scale;
      if (e.touches.length > 1 || (scale !== undefined && scale !== 1)) block(e);
    },
    opts,
  );

  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, block, opts);
  }
}
