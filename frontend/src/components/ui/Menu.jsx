import { useEffect, useRef, useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

/** Kebab dropdown: items = [{ label, icon, onClick, danger }] */
export default function Menu({ items, label = 'Actions', trigger }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  return (
    <div className="menu" ref={ref}>
      <button type="button" className="icon-btn" aria-label={label} aria-expanded={open} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
        {trigger || <MoreHorizontal size={18} />}
      </button>
      {open && (
        <div className="menu-pop" role="menu">
          {items.filter(Boolean).map((it) => {
            const Icon = it.icon;
            return (
              <button key={it.label} type="button" role="menuitem" className={it.danger ? 'danger' : ''} onClick={(e) => { e.stopPropagation(); setOpen(false); it.onClick(); }}>
                {Icon && <Icon size={15} />}{it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
