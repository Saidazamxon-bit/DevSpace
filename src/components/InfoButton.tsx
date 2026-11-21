import { useState } from 'react';
import { Info } from 'lucide-react';
import { Modal } from './ui/Modal';
import { INFO, type InfoKey } from '@/utils/infoTexts';
import { cn } from '@/utils/misc';

/** Kichik dumaloq “i” tugmasi — bosilganda bo‘lim nima vazifa bajarishini tushuntiradi */
export function InfoButton({ topic, className }: { topic: InfoKey; className?: string }) {
  const [open, setOpen] = useState(false);
  const info = INFO[topic];
  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={`${info.title} — ma’lumot`}
        data-info={topic}
        className={cn(
          'inline-grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line text-muted transition-colors hover:border-accent hover:text-accent',
          className,
        )}
      >
        <Info size={14} strokeWidth={2.4} />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        size="sm"
        title={
          <span className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/10 text-accent">
              <Info size={18} />
            </span>
            {info.title}
          </span>
        }
        footer={
          <button type="button" className="btn btn-primary w-full" onClick={() => setOpen(false)} data-autofocus>
            Tushunarli
          </button>
        }
      >
        <ul className="space-y-2.5">
          {info.body.map((t) => (
            <li key={t} className="flex gap-2.5 text-[15px] leading-relaxed text-muted">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>{t}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  );
}
