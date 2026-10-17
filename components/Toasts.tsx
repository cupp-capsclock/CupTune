'use client';
import { useToast } from '@/stores/toast';

export default function Toasts() {
  const toasts = useToast((s) => s.toasts);
  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[100] flex flex-col items-center gap-2 px-4"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role={t.kind === 'err' ? 'alert' : 'status'}
          className={`pointer-events-auto max-w-sm animate-sheet rounded-xl border px-4 py-2.5 text-sm shadow-lg ${
            t.kind === 'err' ? 'border-red-400/50 bg-surface text-red-300' : 'border-line bg-surface2 text-fg'
          }`}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
