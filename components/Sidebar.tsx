'use client';
import { Home, Library, Search, Settings } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Wordmark } from './Logo';

export const NAV = [
  { href: '/', label: 'Beranda', Icon: Home },
  { href: '/cari', label: 'Cari', Icon: Search },
  { href: '/pustaka', label: 'Pustaka', Icon: Library },
];

export function isActive(path: string, href: string) {
  return href === '/' ? path === '/' : path.startsWith(href);
}

export default function Sidebar() {
  const path = usePathname();
  const items = [...NAV, { href: '/pengaturan', label: 'Pengaturan', Icon: Settings }];
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-surface px-3 py-5 md:flex">
      <Link href="/" className="mb-6 px-3" aria-label="CupTune, ke Beranda">
        <Wordmark />
      </Link>
      <nav aria-label="Navigasi utama" className="flex flex-col gap-1">
        {items.map(({ href, label, Icon }) => {
          const on = isActive(path, href);
          return (
            <Link key={href} href={href} aria-current={on ? 'page' : undefined} className={`press flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${on ? 'bg-surface2 text-accent' : 'text-muted hover:bg-surface2 hover:text-fg'}`}>
              <Icon size={20} aria-hidden="true" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto px-3 text-xs leading-relaxed text-muted">
        <p className="mb-1 font-medium text-fg">Pintasan</p>
        <p>Spasi putar/jeda</p>
        <p>← → geser 5 dtk</p>
        <p>Shift + ← → lagu</p>
        <p>M bisu · S acak · R ulang</p>
      </div>
    </aside>
  );
}
