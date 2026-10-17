import type { Metadata, Viewport } from 'next';
import AppShell from '@/components/AppShell';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'CupTune — Your Music, Your Vibe.', template: '%s · CupTune' },
  description: 'CupTune is a lightweight music discovery and playback experience built by MkdirCup.',
  authors: [{ name: 'MkdirCup' }],
  applicationName: 'CupTune',
  appleWebApp: { capable: true, title: 'CupTune', statusBarStyle: 'black-translucent' },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#000000',
};

// Terapkan tema tersimpan sebelum render pertama agar tidak berkedip.
const THEME_SCRIPT = `try{var s=JSON.parse(localStorage.getItem('cuptune:settings')||'{}'),d=document.documentElement;if(s.theme)d.dataset.theme=s.theme;if(s.accent)d.dataset.accent=s.accent;if(s.motion)d.dataset.motion=s.motion}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" suppressHydrationWarning data-theme="dark" data-accent="sky" data-motion="system">
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
