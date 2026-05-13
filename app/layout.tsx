import './globals.css';
import Script from 'next/script';
import type { Metadata } from 'next';
import { Inter, Plus_Jakarta_Sans } from 'next/font/google';
import { Providers } from './providers';
import { Shell } from './components/shell';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
});

export const metadata: Metadata = {
  title: 'Digital Planner - Intelligent Workflow Operating System',
  description: 'Focused execution. Structured accountability.',
  metadataBase: new URL('http://localhost:3000'),
  openGraph: {
    title: 'Digital Planner',
    description: 'A futuristic workflow OS for elite modern teams.',
    type: 'website'
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${plusJakartaSans.variable} font-sans`}>
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{const saved=window.localStorage.getItem('theme-mode');const mode=saved||'system';const media=window.matchMedia('(prefers-color-scheme: dark)');const useDark=mode==='dark'||(mode==='system'&&media.matches);document.documentElement.classList.toggle('dark', useDark);document.documentElement.dataset.theme=mode;}catch(e){}})();`}
        </Script>
        <Providers>
          <Shell>{children}</Shell>
        </Providers>
      </body>
    </html>
  );
}