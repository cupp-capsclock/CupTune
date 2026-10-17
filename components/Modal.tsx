'use client';
import { useEffect, useRef } from 'react';
import type { ReactNode } from 'react';

export default function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      } else if (e.key === 'Tab' && ref.current) {
        const f = Array.from(ref.current.querySelectorAll<HTMLElement>('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')).filter((x) => !x.hasAttribute('disabled'));
        if (!f.length) return;
        const first = f[0];
        const last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const t = setTimeout(() => {
      const el = ref.current?.querySelector<HTMLElement>('[data-autofocus]') ?? ref.current?.querySelector<HTMLElement>('button,input');
      el?.focus();
    }, 30);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center md:items-center" role="presentation">
      <div className="absolute inset-0 animate-fade bg-black/60" onClick={onClose} />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative max-h-[85dvh] w-full animate-sheet overflow-y-auto rounded-t-3xl border border-line bg-surface p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:max-w-md md:rounded-3xl md:pb-4"
      >
        <h2 className="mb-3 px-1 text-base font-semibold">{title}</h2>
        {children}
      </div>
    </div>
  );
}
