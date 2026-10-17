'use client';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4">
      <AlertTriangle className="mt-0.5 shrink-0 text-red-400" size={20} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">{message}</p>
        {onRetry && (
          <button onClick={onRetry} className="press mt-3 inline-flex items-center gap-2 rounded-full bg-surface2 px-4 py-2 text-sm font-medium">
            <RefreshCw size={14} aria-hidden="true" /> Coba lagi
          </button>
        )}
      </div>
    </div>
  );
}

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: string; text?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      {icon && <div className="text-muted">{icon}</div>}
      <h3 className="font-medium">{title}</h3>
      {text && <p className="max-w-xs text-sm text-muted">{text}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="w-36 shrink-0 animate-pulse sm:w-40" aria-hidden="true">
      <div className="aspect-square rounded-2xl bg-surface2" />
      <div className="mt-2 h-3 w-4/5 rounded bg-surface2" />
      <div className="mt-1.5 h-3 w-1/2 rounded bg-surface2" />
    </div>
  );
}

export function RowSkeleton({ n = 6 }: { n?: number }) {
  return (
    <div className="space-y-2" aria-hidden="true">
      {Array.from({ length: n }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 p-2">
          <div className="h-12 w-12 rounded-lg bg-surface2" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-3/5 rounded bg-surface2" />
            <div className="h-3 w-2/5 rounded bg-surface2" />
          </div>
        </div>
      ))}
    </div>
  );
}
