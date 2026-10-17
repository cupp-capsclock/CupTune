'use client';
import { PlayCircle } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { usePlayer } from '@/stores/player';
import { toast } from '@/stores/toast';
import { NAV, isActive } from './Sidebar';

const item = 'press relative flex h-full w-full flex-col items-center justify-center gap-0.5 text-[11px] font-medium';

export default function BottomNav() {
  const path = usePathname();
  const expanded = usePlayer((s) => s.expanded);
  const hasTrack = usePlayer((s) => s.index >= 0);
  return (
    <nav aria-label="Navigasi utama" className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
      <ul className="grid h-14 grid-cols-4">
        {NAV.map(({ href, label, Icon }) => {
          const on = isActive(path, href);
          return (
            <li key={href}>
              <Link href={href} aria-current={on ? 'page' : undefined} className={`${item} ${on ? 'text-accent' : 'text-muted'}`}>
                {on && <span aria-hidden="true" className="absolute top-0 h-0.5 w-8 rounded-full bg-accent shadow-[0_0_10px_rgb(var(--accent))]" />}
                <Icon size={22} aria-hidden="true" />
                {label}
              </Link>
            </li>
          );
        })}
        <li>
          <button
            onClick={() => (hasTrack ? usePlayer.getState().setExpanded(true) : toast('Putar lagu dulu untuk membuka Now Playing'))}
            aria-label="Buka Now Playing"
            className={`${item} ${expanded ? 'text-accent' : hasTrack ? 'text-fg' : 'text-muted'}`}
          >
            <PlayCircle size={22} aria-hidden="true" />
            Now Playing
          </button>
        </li>
      </ul>
    </nav>
  );
}
