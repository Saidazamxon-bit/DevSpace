/**
 * Telefonda sahifani kattalashtirish/kichiklashtirishni butunlay o‘chiradi.
 * iOS Safari viewport’dagi `user-scalable=no` ni e’tiborsiz qoldiradi, shuning uchun
 * gesture va ko‘p barmoqli teginishlar JS orqali ham bloklanadi.
 */
export function disableZoom() {
  if (typeof document === 'undefined') return;
  const block = (e: Event) => e.preventDefault();

  // iOS Safari: pinch gesture hodisalari
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, block, { passive: false });
  }

  // Ikki va undan ortiq barmoq bilan harakat — pinch-zoom
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );

  // Ikki marta bosib kattalashtirish CSS `touch-action` orqali o‘chirilgan (index.css) —
  // JS bilan bloklash tez ketma-ket bosilgan tugmalarni ham yutib yuborardi.
}
