import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export default function Crumbs({ trail, current }: { trail: { href: string; label: string }[]; current: string }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-4 flex min-w-0 items-center gap-1 text-sm text-muted">
      {trail.map((t) => (
        <span key={t.href} className="flex shrink-0 items-center gap-1">
          <Link href={t.href} className="rounded px-1 py-1.5 hover:text-fg">
            {t.label}
          </Link>
          <ChevronRight size={14} aria-hidden="true" />
        </span>
      ))}
      <span className="truncate text-fg" aria-current="page">
        {current}
      </span>
    </nav>
  );
}
